// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({ exigirSesion: vi.fn(), restaurarEjercicio: vi.fn() }));

vi.mock('@/lib/auth/sesion', () => ({ exigirSesion: mocks.exigirSesion }));
vi.mock('@/lib/dataService', () => ({ restaurarEjercicio: mocks.restaurarEjercicio }));

import { POST } from './route';

const ID = '11111111-1111-4111-8111-111111111111';
const restaurar = () =>
  POST(new Request(`http://localhost/api/gym/ejercicios/${ID}/restaurar`, { method: 'POST' }), {
    params: Promise.resolve({ id: ID }),
  });

describe('POST /api/gym/ejercicios/[id]/restaurar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exigirSesion.mockResolvedValue({ id: 'cuenta-a', email: 'a@ejemplo.com' });
    mocks.restaurarEjercicio.mockResolvedValue(undefined);
  });

  it('sin sesión responde 401', async () => {
    mocks.exigirSesion.mockRejectedValue(new ErrorDeNegocio('NO_AUTORIZADO'));

    expect((await restaurar()).status).toBe(401);
    expect(mocks.restaurarEjercicio).not.toHaveBeenCalled();
  });

  it('un ejercicio de otra cuenta responde 404', async () => {
    mocks.restaurarEjercicio.mockRejectedValue(new ErrorDeNegocio('EJERCICIO_NO_ENCONTRADO'));

    expect((await restaurar()).status).toBe(404);
  });

  it('restaura en la cuenta de la sesión y responde 200 (también si ya estaba activo)', async () => {
    const respuesta = await restaurar();

    expect(respuesta.status).toBe(200);
    expect((await respuesta.json()).datos).toEqual({ archivado: false });
    expect(mocks.restaurarEjercicio).toHaveBeenCalledWith('cuenta-a', ID);
  });
});
