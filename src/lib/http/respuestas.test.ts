// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const reportarError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/monitoreo/reportar', () => ({ reportarError }));

import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { conManejoDeErrores } from './respuestas';

const ruta = (error: unknown) =>
  conManejoDeErrores(async () => {
    throw error;
  });

describe('conManejoDeErrores y Sentry', () => {
  beforeEach(() => {
    reportarError.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('los ErrorDeNegocio (400, 401, 404, 422, 429) responden su estado y no se reportan', async () => {
    for (const [codigo, estado] of [
      ['DATOS_INVALIDOS', 400],
      ['NO_AUTORIZADO', 401],
      ['EJERCICIO_NO_ENCONTRADO', 404],
      ['NOMBRE_NO_PERMITIDO', 422],
      ['LIMITE_CHAT', 429],
    ] as const) {
      const respuesta = await ruta(new ErrorDeNegocio(codigo))(new Request('http://localhost/api'), undefined);
      expect(respuesta.status, codigo).toBe(estado);
    }
    const validacion = await ruta(z.object({ a: z.string() }).safeParse({}).error)(new Request('http://localhost/api'), undefined);
    expect(validacion.status).toBe(400);
    expect(reportarError).not.toHaveBeenCalled();
  });

  it('un error inesperado responde 500 y se reporta una vez', async () => {
    const fallo = new Error('conexión perdida');
    const respuesta = await ruta(fallo)(new Request('http://localhost/api'), undefined);
    expect(respuesta.status).toBe(500);
    expect(reportarError).toHaveBeenCalledTimes(1);
    expect(reportarError).toHaveBeenCalledWith(fallo);
  });
});
