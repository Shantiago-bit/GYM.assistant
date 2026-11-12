// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listarCuentasParaLimpiar: vi.fn(),
  eliminarCuentaConDatos: vi.fn(),
  borrarRegistrosDeCorreoAntiguos: vi.fn(),
}));

vi.mock('@/lib/dataService', () => ({
  listarCuentasParaLimpiar: mocks.listarCuentasParaLimpiar,
  eliminarCuentaConDatos: mocks.eliminarCuentaConDatos,
  borrarRegistrosDeCorreoAntiguos: mocks.borrarRegistrosDeCorreoAntiguos,
}));

import { GET } from './route';

const llamar = (autorizacion?: string) =>
  GET(new Request('http://localhost/api/tareas/limpiar-autorizaciones', autorizacion ? { headers: { authorization: autorizacion } } : {}));

describe('GET /api/tareas/limpiar-autorizaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('CRON_SECRET', 'secreto-de-prueba');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mocks.listarCuentasParaLimpiar.mockResolvedValue(['c1', 'c2', 'c3']);
    mocks.borrarRegistrosDeCorreoAntiguos.mockResolvedValue(4);
    mocks.eliminarCuentaConDatos.mockImplementation(async (id: string) => {
      if (id === 'c2') throw new Error('fallo');
    });
  });

  afterEach(() => vi.unstubAllEnvs());

  it('sin el secreto correcto responde 401 y no borra nada', async () => {
    expect((await llamar()).status).toBe(401);
    expect((await llamar('Bearer otro')).status).toBe(401);
    expect(mocks.listarCuentasParaLimpiar).not.toHaveBeenCalled();
    expect(mocks.borrarRegistrosDeCorreoAntiguos).not.toHaveBeenCalled();
  });

  it('sin CRON_SECRET configurado no se ejecuta', async () => {
    vi.stubEnv('CRON_SECRET', '');
    expect((await llamar('Bearer ')).status).toBe(503);
    expect(mocks.listarCuentasParaLimpiar).not.toHaveBeenCalled();
  });

  it('con el secreto elimina las cuentas rechazadas o vencidas y los registros de correo de más de 30 días', async () => {
    const respuesta = await llamar('Bearer secreto-de-prueba');

    expect(respuesta.status).toBe(200);
    expect((await respuesta.json()).datos).toEqual({ eliminadas: 2, fallidas: 1, registrosCorreo: 4 });
    expect(mocks.borrarRegistrosDeCorreoAntiguos).toHaveBeenCalledWith(30);
    expect(mocks.eliminarCuentaConDatos).toHaveBeenCalledTimes(3);
  });
});
