// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirSesion: vi.fn(),
  obtenerPerfil: vi.fn(),
  crearPerfil: vi.fn(),
  actualizarPerfil: vi.fn(),
  registrarIntentoOfensivo: vi.fn(),
  borrarPerfil: vi.fn(),
  enviarSolicitudAlTutor: vi.fn(),
  obtenerDiasVigentes: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirSesion: mocks.exigirSesion }));
vi.mock('@/lib/dataService', () => ({
  obtenerPerfil: mocks.obtenerPerfil,
  crearPerfil: mocks.crearPerfil,
  actualizarPerfil: mocks.actualizarPerfil,
  registrarIntentoOfensivo: mocks.registrarIntentoOfensivo,
  borrarPerfil: mocks.borrarPerfil,
  obtenerDiasVigentes: mocks.obtenerDiasVigentes,
  estaBloqueado: vi.fn(),
}));
vi.mock('@/lib/auth/autorizacionTutor', () => ({
  enviarSolicitudAlTutor: mocks.enviarSolicitudAlTutor,
  ErrorEnvioTutor: class ErrorEnvioTutor extends Error {},
}));

import { GET, PATCH, POST } from './route';

const PERFIL = {
  usuarioId: 'cuenta-a',
  nombre: 'Ana Pérez',
  apodo: 'Anita',
  fechaNacimiento: '1998-04-02',
  genero: 'mujer',
  avatarRuta: null,
  autorizacion: 'no_requerida',
  cumpleVistoAnio: null,
  miembroDesde: '2026-10-01 10:00:00+00',
};

function pedido(metodo: 'POST' | 'PATCH', cuerpo: unknown) {
  return new Request('http://localhost/api/gym/perfil', {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
}

describe('/api/gym/perfil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exigirSesion.mockResolvedValue({ id: 'cuenta-a', email: 'a@ejemplo.com' });
    mocks.obtenerPerfil.mockReset().mockResolvedValue(PERFIL);
    mocks.actualizarPerfil.mockImplementation(async (_id, datos) => ({ ...PERFIL, ...datos, apodo: datos.apodo ?? null }));
  });

  it('sin sesión responde 401 y no toca nada', async () => {
    mocks.exigirSesion.mockRejectedValue(new ErrorDeNegocio('NO_AUTORIZADO'));

    expect((await PATCH(pedido('PATCH', { nombre: 'Ana', genero: 'mujer', dias: [1, 3, 5] }), undefined)).status).toBe(401);
    expect((await POST(pedido('POST', {}), undefined)).status).toBe(401);
    expect(mocks.actualizarPerfil).not.toHaveBeenCalled();
    expect(mocks.crearPerfil).not.toHaveBeenCalled();
  });

  it('GET devuelve los datos editables y los días vigentes de la cuenta de la sesión', async () => {
    mocks.obtenerDiasVigentes.mockResolvedValue([1, 3, 5]);
    const respuesta = await GET(new Request('http://localhost/api/gym/perfil'), undefined);

    expect(respuesta.status).toBe(200);
    expect((await respuesta.json()).datos).toMatchObject({ nombre: 'Ana Pérez', apodo: 'Anita', dias: [1, 3, 5] });
    expect(mocks.obtenerDiasVigentes).toHaveBeenCalledWith('cuenta-a', expect.any(String));
  });

  it('PATCH edita la cuenta de la sesión y devuelve el nombre para mostrar', async () => {
    const respuesta = await PATCH(pedido('PATCH', { nombre: ' Ana María ', apodo: '', genero: 'otro' }), undefined);

    expect(respuesta.status).toBe(200);
    expect(mocks.actualizarPerfil).toHaveBeenCalledWith('cuenta-a', { nombre: 'Ana María', apodo: undefined, genero: 'otro' });
    expect((await respuesta.json()).datos).toMatchObject({ nombreMostrado: 'Ana', apodo: null });
  });

  it('PATCH rechaza nombres ofensivos con 422, sin contar intentos ni bloquear', async () => {
    const respuesta = await PATCH(pedido('PATCH', { nombre: 'Ana', apodo: 'M1erda', genero: 'mujer', dias: [1, 3, 5] }), undefined);

    expect(respuesta.status).toBe(422);
    expect((await respuesta.json()).error.mensaje).toBe('Ese nombre no está permitido. Elige otro, por favor.');
    expect(mocks.actualizarPerfil).not.toHaveBeenCalled();
    expect(mocks.registrarIntentoOfensivo).not.toHaveBeenCalled();
  });

  it('PATCH no acepta cambiar la fecha de nacimiento', async () => {
    await PATCH(pedido('PATCH', { nombre: 'Ana', genero: 'mujer', fechaNacimiento: '2015-01-01' }), undefined);
    expect(mocks.actualizarPerfil.mock.calls[0]![1]).not.toHaveProperty('fechaNacimiento');
  });

  it('POST completa el perfil de una cuenta antigua', async () => {
    mocks.obtenerPerfil.mockResolvedValueOnce(null).mockResolvedValueOnce(PERFIL);
    const datos = { nombre: 'Ana Pérez', apodo: 'Anita', fechaNacimiento: '1998-04-02', genero: 'mujer', dias: [1, 3, 5] };

    const respuesta = await POST(pedido('POST', datos), undefined);

    expect(respuesta.status).toBe(201);
    expect(mocks.crearPerfil).toHaveBeenCalledWith('cuenta-a', datos);
  });

  it('POST: 409 si ya tiene perfil y 422 con un nombre ofensivo', async () => {
    const datos = { nombre: 'Ana', fechaNacimiento: '1998-04-02', genero: 'mujer', dias: [1, 3, 5] };
    expect((await POST(pedido('POST', datos), undefined)).status).toBe(409);

    mocks.obtenerPerfil.mockResolvedValue(null);
    expect((await POST(pedido('POST', { ...datos, nombre: 'Pendejo' }), undefined)).status).toBe(422);
    expect(mocks.crearPerfil).not.toHaveBeenCalled();
  });

  it('POST de un menor: pide el correo del tutor, deja el perfil pendiente y le escribe al tutor', async () => {
    const menor = { nombre: 'Lucía', fechaNacimiento: `${new Date().getFullYear() - 10}-01-01`, genero: 'mujer', dias: [1, 3, 5] };
    mocks.obtenerPerfil.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    expect((await POST(pedido('POST', menor), undefined)).status).toBe(400);
    expect((await POST(pedido('POST', { ...menor, correoTutor: 'a@ejemplo.com' }), undefined)).status).toBe(400);

    mocks.obtenerPerfil.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...PERFIL, autorizacion: 'pendiente' });
    const respuesta = await POST(pedido('POST', { ...menor, correoTutor: 'mama@ejemplo.com' }), undefined);

    expect(respuesta.status).toBe(201);
    expect((await respuesta.json()).datos.autorizacion).toBe('pendiente');
    expect(mocks.crearPerfil).toHaveBeenCalledWith('cuenta-a', menor, 'pendiente');
    expect(mocks.enviarSolicitudAlTutor).toHaveBeenCalledWith('cuenta-a', 'mama@ejemplo.com', 'a@ejemplo.com', menor);
  });

  it('POST de un menor: si el correo al tutor falla, deshace el perfil y responde 502', async () => {
    const { ErrorEnvioTutor } = await import('@/lib/auth/autorizacionTutor');
    mocks.obtenerPerfil.mockResolvedValue(null);
    mocks.enviarSolicitudAlTutor.mockRejectedValueOnce(new ErrorEnvioTutor('Gmail caído'));
    const menor = { nombre: 'Lucía', fechaNacimiento: `${new Date().getFullYear() - 10}-01-01`, genero: 'mujer', dias: [1, 3, 5], correoTutor: 'mama@ejemplo.com' };

    const respuesta = await POST(pedido('POST', menor), undefined);

    expect(respuesta.status).toBe(502);
    expect(mocks.borrarPerfil).toHaveBeenCalledWith('cuenta-a');
  });
});
