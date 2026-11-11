// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirSesion: vi.fn(),
  obtenerEjercicio: vi.fn(),
  eliminarEjercicio: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirSesion: mocks.exigirSesion }));
vi.mock('@/lib/dataService', () => ({
  obtenerEjercicio: mocks.obtenerEjercicio,
  eliminarEjercicio: mocks.eliminarEjercicio,
}));

import { DELETE } from './route';

const ID = '11111111-1111-4111-8111-111111111111';
const contexto = { params: Promise.resolve({ id: ID }) };
const borrar = (cuerpo: unknown) =>
  DELETE(
    new Request(`http://localhost/api/gym/ejercicios/${ID}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    }),
    contexto,
  );

describe('DELETE /api/gym/ejercicios/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exigirSesion.mockResolvedValue({ id: 'cuenta-a', email: 'a@ejemplo.com' });
    mocks.obtenerEjercicio.mockResolvedValue({ ejercicio: { id: ID, nombre: 'Press de banca' } });
    mocks.eliminarEjercicio.mockResolvedValue({ sesiones: 3, series: 9 });
  });

  it('sin sesión responde 401 y no borra nada', async () => {
    mocks.exigirSesion.mockRejectedValue(new ErrorDeNegocio('NO_AUTORIZADO'));

    expect((await borrar({ confirmacion: 'Press de banca' })).status).toBe(401);
    expect(mocks.eliminarEjercicio).not.toHaveBeenCalled();
  });

  it('un ejercicio de otra cuenta responde 404 y no se borra', async () => {
    mocks.obtenerEjercicio.mockRejectedValue(new ErrorDeNegocio('EJERCICIO_NO_ENCONTRADO'));

    expect((await borrar({ confirmacion: 'Press de banca' })).status).toBe(404);
    expect(mocks.eliminarEjercicio).not.toHaveBeenCalled();
  });

  it('sin la confirmación o con otro nombre responde 400', async () => {
    for (const cuerpo of [{}, { confirmacion: 'Sentadilla' }, { confirmacion: '' }]) {
      expect((await borrar(cuerpo)).status).toBe(400);
    }
    expect(mocks.eliminarEjercicio).not.toHaveBeenCalled();
  });

  it('con el nombre correcto (sin importar mayúsculas ni espacios) borra y responde los totales', async () => {
    const respuesta = await borrar({ confirmacion: '  PRESS DE BANCA ' });

    expect(respuesta.status).toBe(200);
    expect((await respuesta.json()).datos).toEqual({ eliminado: true, sesiones: 3, series: 9 });
    expect(mocks.eliminarEjercicio).toHaveBeenCalledWith('cuenta-a', ID);
  });
});
