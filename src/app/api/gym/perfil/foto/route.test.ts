// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirSesion: vi.fn(),
  obtenerPerfil: vi.fn(),
  subirAvatar: vi.fn(),
  borrarAvatar: vi.fn(),
  guardarRutaAvatar: vi.fn(),
  urlFirmadaAvatar: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirSesion: mocks.exigirSesion }));
vi.mock('@/lib/dataService', () => ({
  obtenerPerfil: mocks.obtenerPerfil,
  subirAvatar: mocks.subirAvatar,
  borrarAvatar: mocks.borrarAvatar,
  guardarRutaAvatar: mocks.guardarRutaAvatar,
  urlFirmadaAvatar: mocks.urlFirmadaAvatar,
}));

import { DELETE, POST } from './route';

const WEBP = new Uint8Array([...new TextEncoder().encode('RIFF'), 0, 0, 0, 0, ...new TextEncoder().encode('WEBPVP8 '), 1, 2, 3]);

function subida(bytes: Uint8Array, nombre = 'avatar.webp', tipo = 'image/webp') {
  const formulario = new FormData();
  formulario.append('foto', new File([bytes.slice().buffer], nombre, { type: tipo }));
  return new Request('http://localhost/api/gym/perfil/foto', { method: 'POST', body: formulario });
}

describe('/api/gym/perfil/foto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exigirSesion.mockResolvedValue({ id: 'cuenta-a', email: 'a@ejemplo.com' });
    mocks.obtenerPerfil.mockResolvedValue({ autorizacion: 'no_requerida' });
    mocks.subirAvatar.mockResolvedValue('cuenta-a/avatar.webp');
    mocks.urlFirmadaAvatar.mockResolvedValue('https://almacen.example/firmada');
  });

  it('sin sesión responde 401', async () => {
    mocks.exigirSesion.mockRejectedValue(new ErrorDeNegocio('NO_AUTORIZADO'));

    expect((await POST(subida(WEBP), undefined)).status).toBe(401);
    expect((await DELETE(new Request('http://localhost/api/gym/perfil/foto', { method: 'DELETE' }), undefined)).status).toBe(401);
    expect(mocks.subirAvatar).not.toHaveBeenCalled();
    expect(mocks.borrarAvatar).not.toHaveBeenCalled();
  });

  it('sube la foto a la carpeta de la cuenta de la sesión y devuelve una URL firmada', async () => {
    const respuesta = await POST(subida(WEBP), undefined);

    expect(respuesta.status).toBe(200);
    expect(mocks.subirAvatar).toHaveBeenCalledWith('cuenta-a', expect.any(Uint8Array), 'image/webp');
    expect(mocks.guardarRutaAvatar).toHaveBeenCalledWith('cuenta-a', 'cuenta-a/avatar.webp');
    expect((await respuesta.json()).datos).toEqual({ avatarUrl: 'https://almacen.example/firmada' });
  });

  it('decide el tipo por los bytes: un SVG disfrazado de PNG responde 400', async () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const respuesta = await POST(subida(svg, 'foto.png', 'image/png'), undefined);

    expect(respuesta.status).toBe(400);
    expect(mocks.subirAvatar).not.toHaveBeenCalled();
  });

  it('una foto de más de 2 MB responde 413', async () => {
    const grande = new Uint8Array(2 * 1024 * 1024 + 1);
    grande.set(WEBP);
    const respuesta = await POST(subida(grande), undefined);

    expect(respuesta.status).toBe(413);
    expect(mocks.subirAvatar).not.toHaveBeenCalled();
  });

  it('sin archivo responde 400', async () => {
    const pedido = new Request('http://localhost/api/gym/perfil/foto', { method: 'POST', body: new FormData() });
    expect((await POST(pedido, undefined)).status).toBe(400);
  });

  it('un menor sin autorización aprobada no puede subir foto', async () => {
    mocks.obtenerPerfil.mockResolvedValue({ autorizacion: 'pendiente' });
    expect((await POST(subida(WEBP), undefined)).status).toBe(403);
    expect(mocks.subirAvatar).not.toHaveBeenCalled();
  });

  it('DELETE borra la foto de la cuenta de la sesión', async () => {
    const respuesta = await DELETE(new Request('http://localhost/api/gym/perfil/foto', { method: 'DELETE' }), undefined);

    expect(respuesta.status).toBe(200);
    expect(mocks.borrarAvatar).toHaveBeenCalledWith('cuenta-a');
    expect(mocks.guardarRutaAvatar).toHaveBeenCalledWith('cuenta-a', null);
  });
});
