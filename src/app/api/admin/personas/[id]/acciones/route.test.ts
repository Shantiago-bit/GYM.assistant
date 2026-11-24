// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  obtenerAdministrador: vi.fn(),
  cuentaObjetivo: vi.fn(),
  eliminarCuentaConDatos: vi.fn(),
  reactivarCuenta: vi.fn(),
  suspenderCuenta: vi.fn(),
  registrarAuditoria: vi.fn(),
  reenviarConfirmacion: vi.fn(),
  reenviarSolicitud: vi.fn(),
  orden: [] as string[],
}));

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));
vi.mock('@/lib/auth/sesion', () => ({ obtenerSesion: mocks.obtenerSesion }));
vi.mock('@/lib/datos/admin', () => ({ obtenerAdministrador: mocks.obtenerAdministrador }));
vi.mock('@/lib/auth/registro', () => ({ reenviarConfirmacion: mocks.reenviarConfirmacion }));
vi.mock('@/lib/auth/autorizacionTutor', () => ({ reenviarSolicitud: mocks.reenviarSolicitud }));
vi.mock('@/lib/dataService', () => ({
  ETIQUETA_CACHE_ADMIN: 'admin',
  cuentaObjetivo: mocks.cuentaObjetivo,
  eliminarCuentaConDatos: mocks.eliminarCuentaConDatos,
  reactivarCuenta: mocks.reactivarCuenta,
  suspenderCuenta: mocks.suspenderCuenta,
  registrarAuditoria: mocks.registrarAuditoria,
}));

import { POST } from './route';

const ADMIN = '00000000-0000-4000-8000-0000000000aa';
const OTRA = '00000000-0000-4000-8000-0000000000bb';
const CORREO = 'persona@example.com';

const pedir = (id: string, cuerpo: unknown) =>
  POST(
    new Request(`http://localhost/api/admin/personas/${id}/acciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    }),
    { params: Promise.resolve({ id }) },
  );

const comoAdmin = (rol: 'admin' | 'lectura' = 'admin') => {
  mocks.obtenerSesion.mockResolvedValue({ id: ADMIN, email: 'admin@example.com', aal: 'aal2' });
  mocks.obtenerAdministrador.mockResolvedValue({ rol, suspendido: false });
};

describe('POST /api/admin/personas/[id]/acciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.orden.length = 0;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.cuentaObjetivo.mockResolvedValue({ correo: CORREO, esAdmin: false, estado: 'confirmada' });
    mocks.registrarAuditoria.mockImplementation(async () => void mocks.orden.push('auditoria'));
    mocks.eliminarCuentaConDatos.mockImplementation(async () => void mocks.orden.push('eliminar'));
  });

  it('sin sesión → 401', async () => {
    mocks.obtenerSesion.mockResolvedValue(null);
    expect((await pedir(OTRA, { accion: 'suspender' })).status).toBe(401);
    expect(mocks.suspenderCuenta).not.toHaveBeenCalled();
  });

  it('una persona que no administra → 404', async () => {
    mocks.obtenerSesion.mockResolvedValue({ id: ADMIN, email: 'x@example.com', aal: 'aal2' });
    mocks.obtenerAdministrador.mockResolvedValue(null);
    expect((await pedir(OTRA, { accion: 'suspender' })).status).toBe(404);
  });

  it('rol de solo lectura → 403 en las acciones', async () => {
    comoAdmin('lectura');
    const respuesta = await pedir(OTRA, { accion: 'suspender' });
    expect(respuesta.status).toBe(403);
    expect(mocks.suspenderCuenta).not.toHaveBeenCalled();
    expect(mocks.registrarAuditoria).not.toHaveBeenCalled();
  });

  it('sobre la propia cuenta → 403', async () => {
    comoAdmin();
    const respuesta = await pedir(ADMIN, { accion: 'suspender' });
    expect(respuesta.status).toBe(403);
    expect((await respuesta.json()).error.codigo).toBe('ACCION_NO_PERMITIDA');
    expect(mocks.suspenderCuenta).not.toHaveBeenCalled();
  });

  it('sobre otra cuenta de administración → 403', async () => {
    comoAdmin();
    mocks.cuentaObjetivo.mockResolvedValue({ correo: 'otra-admin@example.com', esAdmin: true, estado: 'confirmada' });
    expect((await pedir(OTRA, { accion: 'eliminar', confirmacion: 'otra-admin@example.com' })).status).toBe(403);
    expect(mocks.eliminarCuentaConDatos).not.toHaveBeenCalled();
  });

  it('id que no es UUID o cuenta inexistente → 404', async () => {
    comoAdmin();
    expect((await pedir('no-es-un-id', { accion: 'suspender' })).status).toBe(404);
    mocks.cuentaObjetivo.mockResolvedValue(null);
    expect((await pedir(OTRA, { accion: 'suspender' })).status).toBe(404);
  });

  it('eliminar con la confirmación equivocada → 400 y no borra nada', async () => {
    comoAdmin();
    const respuesta = await pedir(OTRA, { accion: 'eliminar', confirmacion: 'otra@example.com' });
    expect(respuesta.status).toBe(400);
    expect(mocks.eliminarCuentaConDatos).not.toHaveBeenCalled();
    expect(mocks.registrarAuditoria).not.toHaveBeenCalled();
  });

  it('eliminar con el correo correcto: audita ANTES de borrar (el id aún existe)', async () => {
    comoAdmin();
    const respuesta = await pedir(OTRA, { accion: 'eliminar', confirmacion: '  Persona@Example.com ' });
    expect(respuesta.status).toBe(200);
    expect(mocks.orden).toEqual(['auditoria', 'eliminar']);
    expect(mocks.registrarAuditoria).toHaveBeenCalledWith({
      adminId: ADMIN,
      accion: 'eliminar_cuenta',
      objetivoUsuarioId: OTRA,
      detalle: { estado_previo: 'confirmada' },
    });
  });

  it('suspender y reactivar: quedan en la auditoría, sin datos personales', async () => {
    comoAdmin();
    expect((await pedir(OTRA, { accion: 'suspender' })).status).toBe(200);
    expect(mocks.suspenderCuenta).toHaveBeenCalledWith(OTRA);
    expect(mocks.registrarAuditoria).toHaveBeenLastCalledWith({ adminId: ADMIN, accion: 'suspender', objetivoUsuarioId: OTRA, detalle: {} });

    mocks.cuentaObjetivo.mockResolvedValue({ correo: CORREO, esAdmin: false, estado: 'suspendida' });
    expect((await pedir(OTRA, { accion: 'suspender' })).status).toBe(400); // ya lo está
    expect((await pedir(OTRA, { accion: 'reactivar' })).status).toBe(200);
    expect(mocks.reactivarCuenta).toHaveBeenCalledWith(OTRA);
    expect(JSON.stringify(mocks.registrarAuditoria.mock.calls)).not.toContain('@');
  });

  it('reenviar al tutor: solo para menores pendientes', async () => {
    comoAdmin();
    expect((await pedir(OTRA, { accion: 'reenviar_tutor' })).status).toBe(400);
    mocks.cuentaObjetivo.mockResolvedValue({ correo: CORREO, esAdmin: false, estado: 'menor_pendiente' });
    mocks.reenviarSolicitud.mockResolvedValue({ restantes: 2 });
    expect((await pedir(OTRA, { accion: 'reenviar_tutor' })).status).toBe(200);
    expect(mocks.registrarAuditoria).toHaveBeenCalledWith(expect.objectContaining({ accion: 'reenviar_tutor', detalle: { restantes_hoy: 2 } }));
  });

  it('reenviar confirmación: usa el correo de la cuenta y audita el resultado', async () => {
    comoAdmin();
    mocks.reenviarConfirmacion.mockResolvedValue('enviado');
    const respuesta = await pedir(OTRA, { accion: 'reenviar_confirmacion' });
    expect(respuesta.status).toBe(200);
    expect(mocks.reenviarConfirmacion).toHaveBeenCalledWith(CORREO);
    expect(mocks.registrarAuditoria).toHaveBeenCalledWith(expect.objectContaining({ detalle: { resultado: 'enviado' } }));
  });

  it('acción desconocida → 400', async () => {
    comoAdmin();
    expect((await pedir(OTRA, { accion: 'borrar_todo' })).status).toBe(400);
  });
});
