// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  estadoDeAcceso: vi.fn(),
}));

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }));
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getClaims: mocks.getClaims } }) }));
vi.mock('@/lib/datos/autorizaciones', () => ({ estadoDeAcceso: mocks.estadoDeAcceso }));

import { exigirSesion, exigirSesionAunSinAutorizar } from './sesion';

const ID = '00000000-0000-4000-8000-000000000001';

describe('exigirSesion (todo /api/gym)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_URL', 'https://proyecto.example.com');
    vi.stubEnv('NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_PUBLISHABLE_KEY', 'clave-publica-de-prueba');
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: ID, email: 'persona@example.com', aal: 'aal1' } }, error: null });
  });

  it('sin sesión: 401', async () => {
    mocks.getClaims.mockResolvedValue({ data: null, error: new Error('sin token') });
    await expect(exigirSesion()).rejects.toMatchObject({ codigo: 'NO_AUTORIZADO' });
  });

  it('cuenta suspendida: 403 aunque su token siga vigente (el ban no lo invalida al instante)', async () => {
    mocks.estadoDeAcceso.mockResolvedValue({ suspendida: true, sinAutorizar: false });
    await expect(exigirSesion()).rejects.toMatchObject({ codigo: 'CUENTA_SUSPENDIDA' });
    await expect(exigirSesionAunSinAutorizar()).rejects.toMatchObject({ codigo: 'CUENTA_SUSPENDIDA' });
  });

  it('menor sin autorización: 403 en la API general, pero puede reenviar a su tutor', async () => {
    mocks.estadoDeAcceso.mockResolvedValue({ suspendida: false, sinAutorizar: true });
    await expect(exigirSesion()).rejects.toMatchObject({ codigo: 'AUTORIZACION_PENDIENTE' });
    await expect(exigirSesionAunSinAutorizar()).resolves.toMatchObject({ id: ID });
  });

  it('cuenta activa: devuelve la sesión', async () => {
    mocks.estadoDeAcceso.mockResolvedValue({ suspendida: false, sinAutorizar: false });
    await expect(exigirSesion()).resolves.toEqual({ id: ID, email: 'persona@example.com', aal: 'aal1' });
  });
});
