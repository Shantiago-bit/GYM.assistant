// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirSesion: vi.fn(),
  obtenerPerfil: vi.fn(),
  crearPerfil: vi.fn(),
  actualizarPerfil: vi.fn(),
  registrarIntentoOfensivo: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirSesion: mocks.exigirSesion }));
vi.mock('@/lib/dataService', () => ({
  obtenerPerfil: mocks.obtenerPerfil,
  crearPerfil: mocks.crearPerfil,
  actualizarPerfil: mocks.actualizarPerfil,
  registrarIntentoOfensivo: mocks.registrarIntentoOfensivo,
  estaBloqueado: vi.fn(),
}));

import { PATCH, POST } from './route';

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
    mocks.obtenerPerfil.mockResolvedValue(PERFIL);
    mocks.actualizarPerfil.mockImplementation(async (_id, datos) => ({ ...PERFIL, ...datos, apodo: datos.apodo ?? null }));
  });

  it('sin sesión responde 401 y no toca nada', async () => {
    mocks.exigirSesion.mockRejectedValue(new ErrorDeNegocio('NO_AUTORIZADO'));

    expect((await PATCH(pedido('PATCH', { nombre: 'Ana', genero: 'mujer' }), undefined)).status).toBe(401);
    expect((await POST(pedido('POST', {}), undefined)).status).toBe(401);
    expect(mocks.actualizarPerfil).not.toHaveBeenCalled();
    expect(mocks.crearPerfil).not.toHaveBeenCalled();
  });

  it('PATCH edita la cuenta de la sesión y devuelve el nombre para mostrar', async () => {
    const respuesta = await PATCH(pedido('PATCH', { nombre: ' Ana María ', apodo: '', genero: 'otro' }), undefined);

    expect(respuesta.status).toBe(200);
    expect(mocks.actualizarPerfil).toHaveBeenCalledWith('cuenta-a', { nombre: 'Ana María', apodo: undefined, genero: 'otro' });
    expect((await respuesta.json()).datos).toMatchObject({ nombreMostrado: 'Ana', apodo: null });
  });

  it('PATCH rechaza nombres ofensivos con 422, sin contar intentos ni bloquear', async () => {
    const respuesta = await PATCH(pedido('PATCH', { nombre: 'Ana', apodo: 'M1erda', genero: 'mujer' }), undefined);

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
    const datos = { nombre: 'Ana Pérez', apodo: 'Anita', fechaNacimiento: '1998-04-02', genero: 'mujer' };

    const respuesta = await POST(pedido('POST', datos), undefined);

    expect(respuesta.status).toBe(201);
    expect(mocks.crearPerfil).toHaveBeenCalledWith('cuenta-a', datos);
  });

  it('POST: 409 si ya tiene perfil, 422 con un nombre ofensivo y 503 para menores sin autorización', async () => {
    const datos = { nombre: 'Ana', fechaNacimiento: '1998-04-02', genero: 'mujer' };
    expect((await POST(pedido('POST', datos), undefined)).status).toBe(409);

    mocks.obtenerPerfil.mockResolvedValue(null);
    expect((await POST(pedido('POST', { ...datos, nombre: 'Pendejo' }), undefined)).status).toBe(422);
    const menor = `${new Date().getFullYear() - 10}-01-01`;
    expect((await POST(pedido('POST', { ...datos, fechaNacimiento: menor }), undefined)).status).toBe(503);
    expect(mocks.crearPerfil).not.toHaveBeenCalled();
  });
});
