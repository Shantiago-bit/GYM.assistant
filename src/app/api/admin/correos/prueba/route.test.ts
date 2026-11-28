// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  obtenerAdministrador: vi.fn(),
  enviarCorreo: vi.fn(),
  registrarAuditoria: vi.fn(),
  reservarCorreoPruebaAdmin: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock('@/lib/auth/sesion', () => ({ obtenerSesion: mocks.obtenerSesion }));
vi.mock('@/lib/datos/admin', () => ({ obtenerAdministrador: mocks.obtenerAdministrador }));
vi.mock('@/lib/correo', () => ({ enviarCorreo: mocks.enviarCorreo }));
vi.mock('@/lib/urlBase', () => ({ obtenerUrlBase: () => 'https://kairos.example.com' }));
vi.mock('@/lib/dataService', () => ({
  ETIQUETA_CACHE_ADMIN: 'admin',
  registrarAuditoria: mocks.registrarAuditoria,
  reservarCorreoPruebaAdmin: mocks.reservarCorreoPruebaAdmin,
}));

import { POST } from './route';

const ADMIN = '00000000-0000-4000-8000-0000000000aa';
const CORREO_ADMIN = 'admin.panel@example.com';

const pedir = (cuerpo: unknown = {}) =>
  POST(
    new Request('http://localhost/api/admin/correos/prueba', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    }),
    undefined,
  );

const comoAdmin = (rol: 'admin' | 'lectura' = 'admin') => {
  mocks.obtenerSesion.mockResolvedValue({ id: ADMIN, email: CORREO_ADMIN, aal: 'aal2' });
  mocks.obtenerAdministrador.mockResolvedValue({ rol, suspendido: false });
};

describe('POST /api/admin/correos/prueba', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.reservarCorreoPruebaAdmin.mockResolvedValue(true);
    mocks.enviarCorreo.mockResolvedValue({ ok: true, id: 'm1', proveedor: 'gmail' });
  });

  it('sin sesión → 401', async () => {
    mocks.obtenerSesion.mockResolvedValue(null);
    expect((await pedir()).status).toBe(401);
    expect(mocks.enviarCorreo).not.toHaveBeenCalled();
  });

  it('una persona que no administra → 404 y no envía nada', async () => {
    mocks.obtenerSesion.mockResolvedValue({ id: ADMIN, email: 'x@example.com', aal: 'aal2' });
    mocks.obtenerAdministrador.mockResolvedValue(null);
    expect((await pedir()).status).toBe(404);
    expect(mocks.enviarCorreo).not.toHaveBeenCalled();
    expect(mocks.reservarCorreoPruebaAdmin).not.toHaveBeenCalled();
  });

  it('rol de solo lectura → 403 SOLO_LECTURA, sin envío ni auditoría', async () => {
    comoAdmin('lectura');
    const respuesta = await pedir();
    expect(respuesta.status).toBe(403);
    expect((await respuesta.json()).error.codigo).toBe('SOLO_LECTURA');
    expect(mocks.enviarCorreo).not.toHaveBeenCalled();
    expect(mocks.registrarAuditoria).not.toHaveBeenCalled();
  });

  it('dentro del minuto → 429 ESPERA_REQUERIDA, sin envío ni auditoría', async () => {
    comoAdmin();
    mocks.reservarCorreoPruebaAdmin.mockResolvedValue(false);
    const respuesta = await pedir();
    expect(respuesta.status).toBe(429);
    expect((await respuesta.json()).error.codigo).toBe('ESPERA_REQUERIDA');
    expect(mocks.reservarCorreoPruebaAdmin).toHaveBeenCalledWith(ADMIN, 60);
    expect(mocks.enviarCorreo).not.toHaveBeenCalled();
    expect(mocks.registrarAuditoria).not.toHaveBeenCalled();
  });

  it('éxito: envía la plantilla de prueba a la cuenta de la sesión, aunque el cuerpo traiga otra dirección', async () => {
    comoAdmin();
    const respuesta = await pedir({ para: 'otra-persona@example.com' });
    expect(respuesta.status).toBe(200);

    expect(mocks.enviarCorreo).toHaveBeenCalledTimes(1);
    const datos = mocks.enviarCorreo.mock.calls[0]![0];
    expect(datos).toMatchObject({ para: CORREO_ADMIN, tipo: 'prueba', usuarioId: ADMIN, asunto: 'Correo de prueba de Kairós' });
    expect(datos.html).toContain('Prueba de correo');
    expect(datos.html).toContain('https://kairos.example.com/admin/correos');
    expect(JSON.stringify(mocks.enviarCorreo.mock.calls)).not.toContain('otra-persona@example.com');

    const cuerpo = await respuesta.json();
    expect(cuerpo.datos.mensaje).toBe('Correo de prueba enviado a a•••••l@example.com. Revisa también Spam y Promociones.');
    expect(mocks.revalidateTag).toHaveBeenCalledWith('admin');
  });

  it('audita con el proveedor y el resultado, nunca con el correo', async () => {
    comoAdmin();
    await pedir();
    expect(mocks.registrarAuditoria).toHaveBeenCalledWith({
      adminId: ADMIN,
      accion: 'enviar_correo_prueba',
      detalle: { proveedor: 'gmail', resultado: 'aceptado' },
    });
    expect(JSON.stringify(mocks.registrarAuditoria.mock.calls)).not.toMatch(/@/);
  });

  it('si el proveedor falla: 502 con el motivo, y el intento queda auditado como error', async () => {
    comoAdmin();
    mocks.enviarCorreo.mockResolvedValue({ ok: false, error: 'Gmail rechazó el destinatario.', proveedor: 'resend' });
    const respuesta = await pedir();
    expect(respuesta.status).toBe(502);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error.codigo).toBe('CORREO_NO_ENVIADO');
    expect(cuerpo.error.mensaje).toContain('Gmail rechazó el destinatario.');
    expect(mocks.registrarAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'enviar_correo_prueba', detalle: { proveedor: 'resend', resultado: 'error' } }),
    );
  });
});
