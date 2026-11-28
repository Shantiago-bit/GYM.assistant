// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  obtenerAdministrador: vi.fn(),
  cambiarMetaActivasMes: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ obtenerSesion: mocks.obtenerSesion }));
vi.mock('@/lib/datos/admin', () => ({ obtenerAdministrador: mocks.obtenerAdministrador }));
vi.mock('@/lib/dataService', () => ({ cambiarMetaActivasMes: mocks.cambiarMetaActivasMes }));

import { PUT } from './route';

const ADMIN = '00000000-0000-4000-8000-0000000000aa';

const pedir = (cuerpo: unknown) =>
  PUT(
    new Request('http://localhost/api/admin/metas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
    }),
    undefined,
  );

const comoAdmin = (rol: 'admin' | 'lectura' = 'admin', aal: 'aal1' | 'aal2' = 'aal2') => {
  mocks.obtenerSesion.mockResolvedValue({ id: ADMIN, email: 'admin@example.com', aal });
  mocks.obtenerAdministrador.mockResolvedValue({ rol, suspendido: false });
};

describe('PUT /api/admin/metas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.cambiarMetaActivasMes.mockImplementation(async (valor: number) => ({ anterior: 50, nuevo: valor, cambiada: true }));
  });

  it('sin sesión → 401', async () => {
    mocks.obtenerSesion.mockResolvedValue(null);
    expect((await pedir({ valor: 80 })).status).toBe(401);
    expect(mocks.cambiarMetaActivasMes).not.toHaveBeenCalled();
  });

  it('una persona que no administra → 404', async () => {
    mocks.obtenerSesion.mockResolvedValue({ id: ADMIN, email: 'x@example.com', aal: 'aal2' });
    mocks.obtenerAdministrador.mockResolvedValue(null);
    expect((await pedir({ valor: 80 })).status).toBe(404);
    expect(mocks.cambiarMetaActivasMes).not.toHaveBeenCalled();
  });

  it('una cuenta de administración suspendida → 404', async () => {
    mocks.obtenerSesion.mockResolvedValue({ id: ADMIN, email: 'admin@example.com', aal: 'aal2' });
    mocks.obtenerAdministrador.mockResolvedValue({ rol: 'admin', suspendido: true });
    expect((await pedir({ valor: 80 })).status).toBe(404);
  });

  it('sin verificación en dos pasos (aal1) → 403', async () => {
    comoAdmin('admin', 'aal1');
    const respuesta = await pedir({ valor: 80 });
    expect(respuesta.status).toBe(403);
    expect((await respuesta.json()).error.codigo).toBe('VERIFICACION_REQUERIDA');
    expect(mocks.cambiarMetaActivasMes).not.toHaveBeenCalled();
  });

  it('rol de solo lectura → 403 SOLO_LECTURA y no cambia nada', async () => {
    comoAdmin('lectura');
    const respuesta = await pedir({ valor: 80 });
    expect(respuesta.status).toBe(403);
    expect((await respuesta.json()).error.codigo).toBe('SOLO_LECTURA');
    expect(mocks.cambiarMetaActivasMes).not.toHaveBeenCalled();
  });

  it.each([
    ['cero', { valor: 0 }],
    ['negativo', { valor: -3 }],
    ['decimal', { valor: 12.5 }],
    ['por encima del máximo', { valor: 1_000_001 }],
    ['texto', { valor: '80' }],
    ['sin valor', {}],
    ['con campos de más', { valor: 80, clave: 'otra' }],
  ])('valor no válido (%s) → 400 y no cambia nada', async (_caso, cuerpo) => {
    comoAdmin();
    const respuesta = await pedir(cuerpo);
    expect(respuesta.status).toBe(400);
    expect((await respuesta.json()).error.codigo).toBe('DATOS_INVALIDOS');
    expect(mocks.cambiarMetaActivasMes).not.toHaveBeenCalled();
  });

  it('cuerpo que no es JSON → 400', async () => {
    comoAdmin();
    expect((await pedir('{no es json')).status).toBe(400);
  });

  it('valor válido → 200, guarda con el id de quien administra (que audita el cambio) y responde el cambio', async () => {
    comoAdmin();
    const respuesta = await pedir({ valor: 120 });
    expect(respuesta.status).toBe(200);
    expect(mocks.cambiarMetaActivasMes).toHaveBeenCalledWith(120, ADMIN);
    const cuerpo = await respuesta.json();
    expect(JSON.stringify(cuerpo)).toContain('"anterior":50');
    expect(JSON.stringify(cuerpo)).toContain('"nuevo":120');
    expect(JSON.stringify(cuerpo)).toMatch(/Meta actualizada: 120 personas/);
  });

  it('los extremos 1 y 1.000.000 son válidos', async () => {
    comoAdmin();
    expect((await pedir({ valor: 1 })).status).toBe(200);
    expect((await pedir({ valor: 1_000_000 })).status).toBe(200);
  });

  it('si el valor ya era ese → 200 con un mensaje que lo dice', async () => {
    comoAdmin();
    mocks.cambiarMetaActivasMes.mockResolvedValue({ anterior: 80, nuevo: 80, cambiada: false });
    const respuesta = await pedir({ valor: 80 });
    expect(respuesta.status).toBe(200);
    expect(JSON.stringify(await respuesta.json())).toMatch(/La meta ya era de 80/);
  });
});
