// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  obtenerAdministrador: vi.fn(),
  personasParaCsv: vi.fn(),
  registrarAuditoria: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ obtenerSesion: mocks.obtenerSesion }));
vi.mock('@/lib/datos/admin', () => ({ obtenerAdministrador: mocks.obtenerAdministrador }));
vi.mock('@/lib/dataService', () => ({ personasParaCsv: mocks.personasParaCsv, registrarAuditoria: mocks.registrarAuditoria }));

import { GET } from './route';

const ADMIN = '00000000-0000-4000-8000-0000000000aa';
const pedir = (consulta = '') => GET(new Request(`http://localhost/api/admin/personas/csv${consulta}`), undefined);

describe('GET /api/admin/personas/csv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.personasParaCsv.mockResolvedValue([
      { estado: 'confirmada', registro: '2026-11-02', ultimaActividad: '2026-11-20', ejercicios: 4, sesiones: 9, racha: 3, modoAvanzado: false },
      { estado: 'suspendida', registro: '2026-10-15', ultimaActividad: null, ejercicios: 0, sesiones: 0, racha: 0, modoAvanzado: true },
    ]);
  });

  it('sin sesión → 401; quien no administra → 404', async () => {
    mocks.obtenerSesion.mockResolvedValue(null);
    expect((await pedir()).status).toBe(401);
    mocks.obtenerSesion.mockResolvedValue({ id: ADMIN, email: 'x@example.com', aal: 'aal2' });
    mocks.obtenerAdministrador.mockResolvedValue(null);
    expect((await pedir()).status).toBe(404);
    expect(mocks.personasParaCsv).not.toHaveBeenCalled();
  });

  it('respeta los filtros, no tiene correos, nombres ni ids y queda en la auditoría', async () => {
    mocks.obtenerSesion.mockResolvedValue({ id: ADMIN, email: 'admin@example.com', aal: 'aal2' });
    mocks.obtenerAdministrador.mockResolvedValue({ rol: 'lectura', suspendido: false });
    const respuesta = await pedir('?estado=suspendida&desde=2026-10-01&q=persona@example.com');
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('content-type')).toContain('text/csv');
    expect(mocks.personasParaCsv).toHaveBeenCalledWith(expect.objectContaining({ estado: 'suspendida', desde: '2026-10-01' }), expect.any(String));

    const csv = await respuesta.text();
    const [encabezado, ...filas] = csv.trim().split('\n');
    expect(encabezado).toBe('estado,fecha_registro,ultima_actividad,ejercicios,sesiones,racha_actual,modo');
    expect(filas).toEqual(['confirmada,2026-11-02,2026-11-20,4,9,3,sencillo', 'suspendida,2026-10-15,,0,0,0,avanzado']);
    expect(csv).not.toMatch(/@|correo|nombre|apodo|[0-9a-f]{8}-[0-9a-f]{4}/i);

    expect(mocks.registrarAuditoria).toHaveBeenCalledWith({
      adminId: ADMIN,
      accion: 'exportar_csv',
      detalle: { reporte: 'personas', filas: 2, estado: 'suspendida', desde: '2026-10-01', hasta: null },
    });
  });
});
