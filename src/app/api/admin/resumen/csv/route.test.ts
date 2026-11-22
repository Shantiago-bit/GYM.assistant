// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  obtenerAdministrador: vi.fn(),
  obtenerEstadisticasResumen: vi.fn(),
  registrarAuditoria: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ obtenerSesion: mocks.obtenerSesion }));
vi.mock('@/lib/datos/admin', () => ({ obtenerAdministrador: mocks.obtenerAdministrador }));
vi.mock('@/lib/dataService', () => ({
  obtenerEstadisticasResumen: mocks.obtenerEstadisticasResumen,
  registrarAuditoria: mocks.registrarAuditoria,
}));

import { GET } from './route';

const ADMIN = '00000000-0000-4000-8000-0000000000aa';
const pedir = () => GET(new Request('http://localhost/api/admin/resumen/csv'), undefined);
const conSesion = (aal: 'aal1' | 'aal2' = 'aal2') => mocks.obtenerSesion.mockResolvedValue({ id: ADMIN, email: 'admin@example.com', aal });

describe('GET /api/admin/resumen/csv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.obtenerEstadisticasResumen.mockResolvedValue({
      meses: [{ mes: '2026-11', registros: 4, activas: 3, sesiones: 10, series: 31, mensajes: 7 }],
    });
  });

  it('sin sesión → 401 y sin auditoría', async () => {
    mocks.obtenerSesion.mockResolvedValue(null);
    expect((await pedir()).status).toBe(401);
    expect(mocks.registrarAuditoria).not.toHaveBeenCalled();
  });

  it('una persona que no administra → 404 (como si la ruta no existiera)', async () => {
    conSesion();
    mocks.obtenerAdministrador.mockResolvedValue(null);
    const respuesta = await pedir();
    expect(respuesta.status).toBe(404);
    expect((await respuesta.json()).error.mensaje).toBe('No encontrado.');
    expect(mocks.obtenerEstadisticasResumen).not.toHaveBeenCalled();
  });

  it('un administrador sin la verificación en dos pasos → 403', async () => {
    conSesion('aal1');
    mocks.obtenerAdministrador.mockResolvedValue({ rol: 'admin', suspendido: false });
    expect((await pedir()).status).toBe(403);
  });

  it.each(['admin', 'lectura'] as const)('rol %s: descarga el CSV (exportar no modifica datos) y queda en la auditoría', async (rol) => {
    conSesion();
    mocks.obtenerAdministrador.mockResolvedValue({ rol, suspendido: false });

    const respuesta = await pedir();
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('content-type')).toContain('text/csv');
    expect(respuesta.headers.get('content-disposition')).toMatch(/attachment; filename="resumen-gym-assistant-\d{4}-\d{2}-\d{2}\.csv"/);
    expect(mocks.registrarAuditoria).toHaveBeenCalledWith({
      adminId: ADMIN,
      accion: 'exportar_csv',
      detalle: { reporte: 'resumen', meses: 12 },
    });

    const csv = await respuesta.text();
    expect(csv.split('\r\n')[0]).toBe('mes,registros,personas_activas,sesiones,series,mensajes_chrono');
    expect(csv).toContain('2026-11,4,3,10,31,7');
    // Sin datos personales: ni correos ni ids.
    expect(csv).not.toContain('@');
    expect(csv).not.toContain(ADMIN);
  });
});
