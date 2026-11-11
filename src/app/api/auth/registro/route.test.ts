// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  estaBloqueado: vi.fn(),
  registrarIntentoOfensivo: vi.fn(),
  reiniciarIntentos: vi.fn(),
  registrarCuenta: vi.fn(),
  registrarCuentaMenor: vi.fn(),
}));

vi.mock('@/lib/dataService', () => ({
  estaBloqueado: mocks.estaBloqueado,
  registrarIntentoOfensivo: mocks.registrarIntentoOfensivo,
  reiniciarIntentos: mocks.reiniciarIntentos,
}));
vi.mock('@/lib/auth/registro', () => ({
  registrarCuenta: mocks.registrarCuenta,
  ErrorEnvioConfirmacion: class ErrorEnvioConfirmacion extends Error {},
}));
vi.mock('@/lib/auth/autorizacionTutor', () => ({
  registrarCuentaMenor: mocks.registrarCuentaMenor,
  ErrorEnvioTutor: class ErrorEnvioTutor extends Error {},
}));

import { POST as registrar } from './route';
import { POST as revisarPerfil } from './perfil/route';

const anio = new Date().getFullYear();
const ADULTO = { nombre: 'Ana Pérez', apodo: 'Anita', fechaNacimiento: '1998-04-02', genero: 'mujer' };
const MENOR = { ...ADULTO, fechaNacimiento: `${anio - 10}-01-01` };
const NINO = { ...ADULTO, fechaNacimiento: `${anio - 5}-01-01` };
const OFENSIVO = { ...ADULTO, apodo: 'P3nd3j0' };
const CUENTA = { email: 'Ana@Ejemplo.com', password: 'secreta-123' };

function solicitud(ruta: string, cuerpo: unknown, ip = '203.0.113.7') {
  return new Request(`http://localhost${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(cuerpo),
  });
}
const paso1 = (perfil: unknown, ip?: string) => revisarPerfil(solicitud('/api/auth/registro/perfil', perfil, ip), undefined);
const paso2 = (cuerpo: unknown, ip?: string) => registrar(solicitud('/api/auth/registro', cuerpo, ip), undefined);

describe('registro en dos pasos', () => {
  let intentos: number;

  beforeEach(() => {
    vi.clearAllMocks();
    intentos = 0;
    mocks.estaBloqueado.mockResolvedValue(false);
    mocks.registrarIntentoOfensivo.mockImplementation(async () => ++intentos);
    mocks.registrarCuenta.mockResolvedValue('enviado');
    mocks.registrarCuentaMenor.mockResolvedValue('enviado');
  });

  it('paso 1: acepta datos válidos y dice si hace falta autorización', async () => {
    const adulto = await paso1(ADULTO);
    expect(adulto.status).toBe(200);
    expect((await adulto.json()).datos).toMatchObject({ requiereAutorizacion: false });

    const menor = await paso1(MENOR);
    expect((await menor.json()).datos).toMatchObject({ requiereAutorizacion: true });
  });

  it('paso 1: rechaza a menores de la edad mínima con 403', async () => {
    const respuesta = await paso1(NINO);
    expect(respuesta.status).toBe(403);
    expect((await respuesta.json()).error.mensaje).toBe('Necesitas al menos 8 años para usar Gym Assistant.');
  });

  it('paso 1: rechaza fechas futuras con 400', async () => {
    const respuesta = await paso1({ ...ADULTO, fechaNacimiento: `${anio + 1}-01-01` });
    expect(respuesta.status).toBe(400);
    expect((await respuesta.json()).error.mensaje).toBe('La fecha de nacimiento no puede ser futura.');
  });

  it('nombres ofensivos: 422 con el número de intento y, al quinto, 429 que cancela el registro', async () => {
    for (let i = 1; i <= 4; i++) {
      const respuesta = await paso1(OFENSIVO);
      expect(respuesta.status).toBe(422);
      expect((await respuesta.json()).error.mensaje).toBe(
        `Ese nombre no está permitido. Elige otro, por favor. (Intento ${i} de 5)`,
      );
    }
    const quinto = await paso1(OFENSIVO);
    expect(quinto.status).toBe(429);
    expect((await quinto.json()).error.mensaje).toMatch(/^Se canceló la creación de la cuenta/);
  });

  it('el bloqueo también cierra el paso 2, aunque los datos sean válidos', async () => {
    mocks.estaBloqueado.mockResolvedValue(true);

    expect((await paso1(ADULTO)).status).toBe(429);
    expect((await paso2({ perfil: ADULTO, ...CUENTA })).status).toBe(429);
    expect(mocks.registrarCuenta).not.toHaveBeenCalled();
  });

  it('el paso 2 vuelve a revisar los nombres y cuenta el intento', async () => {
    const respuesta = await paso2({ perfil: OFENSIVO, ...CUENTA });
    expect(respuesta.status).toBe(422);
    expect(mocks.registrarIntentoOfensivo).toHaveBeenCalledTimes(1);
    expect(mocks.registrarCuenta).not.toHaveBeenCalled();
  });

  it('la clave del conteo es un hash de la conexión, nunca la IP', async () => {
    await paso1(OFENSIVO, '198.51.100.1');
    await paso1(OFENSIVO, '198.51.100.2');
    const [clave1] = mocks.registrarIntentoOfensivo.mock.calls[0]!;
    const [clave2] = mocks.registrarIntentoOfensivo.mock.calls[1]!;
    expect(clave1).toMatch(/^[0-9a-f]{64}$/);
    expect(clave1).not.toBe(clave2);
    expect(clave1).not.toContain('198.51');
  });

  it('paso 2: crea la cuenta con su perfil y reinicia el contador', async () => {
    const respuesta = await paso2({ perfil: ADULTO, ...CUENTA });

    expect(respuesta.status).toBe(200);
    expect((await respuesta.json()).datos.mensaje).toMatch(/enlace para confirmar/);
    expect(mocks.registrarCuenta).toHaveBeenCalledWith('ana@ejemplo.com', 'secreta-123', ADULTO);
    expect(mocks.reiniciarIntentos).toHaveBeenCalledTimes(1);
  });

  it('paso 2: un menor necesita el correo de su tutor, distinto al suyo', async () => {
    expect((await paso2({ perfil: MENOR, ...CUENTA })).status).toBe(400);
    const igual = await paso2({ perfil: MENOR, ...CUENTA, correoTutor: 'ana@ejemplo.com' });
    expect((await igual.json()).error.mensaje).toBe('El correo de tu tutor debe ser distinto al tuyo.');
    expect(mocks.registrarCuenta).not.toHaveBeenCalled();
    expect(mocks.registrarCuentaMenor).not.toHaveBeenCalled();
  });

  it('paso 2: la cuenta de un menor queda pendiente y el correo va a su tutor', async () => {
    const respuesta = await paso2({ perfil: MENOR, ...CUENTA, correoTutor: ' Mama@Ejemplo.com ' });

    expect(respuesta.status).toBe(200);
    expect((await respuesta.json()).datos).toMatchObject({
      requiereAutorizacion: true,
      mensaje: expect.stringContaining('Le enviamos un correo a tu mamá, papá o tutor'),
    });
    expect(mocks.registrarCuentaMenor).toHaveBeenCalledWith('ana@ejemplo.com', 'secreta-123', MENOR, 'mama@ejemplo.com');
    expect(mocks.registrarCuenta).not.toHaveBeenCalled();
    expect(mocks.reiniciarIntentos).toHaveBeenCalledTimes(1);
  });

  it('paso 2: un adulto no pasa por el tutor aunque envíe un correo de tutor', async () => {
    await paso2({ perfil: ADULTO, ...CUENTA, correoTutor: 'mama@ejemplo.com' });
    expect(mocks.registrarCuentaMenor).not.toHaveBeenCalled();
    expect(mocks.registrarCuenta).toHaveBeenCalledTimes(1);
  });

  it('paso 2: rechaza a menores de la edad mínima aunque se salten el paso 1', async () => {
    expect((await paso2({ perfil: NINO, ...CUENTA, correoTutor: 'mama@ejemplo.com' })).status).toBe(403);
  });
});
