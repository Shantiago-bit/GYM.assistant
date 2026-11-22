// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  obtenerSesion: vi.fn(),
  obtenerAdministrador: vi.fn(),
  // Como en Next: redirect y notFound cortan la ejecución lanzando un error.
  redirect: vi.fn((ruta: string) => {
    throw new Error(`REDIRECT ${ruta}`);
  }),
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND');
  }),
}));

vi.mock('@/lib/auth/sesion', () => ({ obtenerSesion: mocks.obtenerSesion }));
vi.mock('@/lib/datos/admin', () => ({ obtenerAdministrador: mocks.obtenerAdministrador }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect, notFound: mocks.notFound }));

import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { exigirAdmin, exigirAdminDePagina, puedeActuar } from './admin';

const ID = '00000000-0000-4000-8000-000000000001';
const sesion = (aal: 'aal1' | 'aal2') => ({ id: ID, email: 'admin@example.com', aal });

async function codigoDe(promesa: Promise<unknown>): Promise<string> {
  try {
    await promesa;
    return 'sin error';
  } catch (error) {
    return error instanceof ErrorDeNegocio ? error.codigo : (error as Error).message;
  }
}

describe('exigirAdminDePagina (páginas de /admin)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sin sesión → /login', async () => {
    mocks.obtenerSesion.mockResolvedValue(null);
    expect(await codigoDe(exigirAdminDePagina())).toBe('REDIRECT /login');
  });

  it('una persona que no administra → 404 (no revela que /admin existe)', async () => {
    mocks.obtenerSesion.mockResolvedValue(sesion('aal2'));
    mocks.obtenerAdministrador.mockResolvedValue(null);
    expect(await codigoDe(exigirAdminDePagina())).toBe('NOT_FOUND');
  });

  it('un administrador suspendido → 404, sin acceso', async () => {
    mocks.obtenerSesion.mockResolvedValue(sesion('aal2'));
    mocks.obtenerAdministrador.mockResolvedValue({ rol: 'admin', suspendido: true });
    expect(await codigoDe(exigirAdminDePagina())).toBe('NOT_FOUND');
  });

  it('un administrador sin aal2 → /admin/seguridad; en /admin/seguridad sí entra', async () => {
    mocks.obtenerSesion.mockResolvedValue(sesion('aal1'));
    mocks.obtenerAdministrador.mockResolvedValue({ rol: 'admin', suspendido: false });
    expect(await codigoDe(exigirAdminDePagina())).toBe('REDIRECT /admin/seguridad');
    await expect(exigirAdminDePagina({ permitirSinVerificar: true })).resolves.toMatchObject({ id: ID, rol: 'admin' });
  });

  it('un administrador con aal2 entra, con su rol', async () => {
    mocks.obtenerSesion.mockResolvedValue(sesion('aal2'));
    mocks.obtenerAdministrador.mockResolvedValue({ rol: 'lectura', suspendido: false });
    await expect(exigirAdminDePagina()).resolves.toMatchObject({ id: ID, rol: 'lectura', aal: 'aal2' });
  });
});

describe('exigirAdmin (API de /api/admin)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sin sesión → 401; no administra o suspendido → 404; sin aal2 → 403', async () => {
    mocks.obtenerSesion.mockResolvedValue(null);
    expect(await codigoDe(exigirAdmin())).toBe('NO_AUTORIZADO');

    mocks.obtenerSesion.mockResolvedValue(sesion('aal2'));
    mocks.obtenerAdministrador.mockResolvedValue(null);
    expect(await codigoDe(exigirAdmin())).toBe('RECURSO_NO_ENCONTRADO');
    mocks.obtenerAdministrador.mockResolvedValue({ rol: 'admin', suspendido: true });
    expect(await codigoDe(exigirAdmin())).toBe('RECURSO_NO_ENCONTRADO');

    mocks.obtenerSesion.mockResolvedValue(sesion('aal1'));
    mocks.obtenerAdministrador.mockResolvedValue({ rol: 'admin', suspendido: false });
    expect(await codigoDe(exigirAdmin())).toBe('VERIFICACION_REQUERIDA');
  });

  it("rol 'lectura': puede ver, pero las acciones responden 403", async () => {
    mocks.obtenerSesion.mockResolvedValue(sesion('aal2'));
    mocks.obtenerAdministrador.mockResolvedValue({ rol: 'lectura', suspendido: false });
    await expect(exigirAdmin()).resolves.toMatchObject({ rol: 'lectura' });
    expect(await codigoDe(exigirAdmin({ rol: 'admin' }))).toBe('SOLO_LECTURA');
    expect(puedeActuar({ rol: 'lectura' })).toBe(false);
  });

  it("rol 'admin' puede actuar", async () => {
    mocks.obtenerSesion.mockResolvedValue(sesion('aal2'));
    mocks.obtenerAdministrador.mockResolvedValue({ rol: 'admin', suspendido: false });
    await expect(exigirAdmin({ rol: 'admin' })).resolves.toMatchObject({ rol: 'admin' });
    expect(puedeActuar({ rol: 'admin' })).toBe(true);
  });
});
