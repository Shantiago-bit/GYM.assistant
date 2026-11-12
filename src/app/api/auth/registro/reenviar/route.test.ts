// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ reenviarConfirmacion: vi.fn(), usados: new Map<string, number>() }));

vi.mock('@/lib/auth/registro', () => ({ reenviarConfirmacion: mocks.reenviarConfirmacion, MENSAJE_REENVIO: 'mensaje genérico' }));
vi.mock('@/lib/dataService', () => ({
  // Cupo real por clave, como la tabla limites_reenvio.
  consumirCupoReenvio: async (clave: string, maximo: number) => {
    const usados = (mocks.usados.get(clave) ?? 0) + 1;
    mocks.usados.set(clave, usados);
    return usados <= maximo;
  },
}));

import { POST } from './route';

const MENSAJE_REENVIO = 'mensaje genérico';

const pedir = (email: unknown, ip = '203.0.113.9') =>
  POST(
    new Request('http://localhost/api/auth/registro/reenviar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ email }),
    }),
    undefined,
  );

describe('POST /api/auth/registro/reenviar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usados.clear();
  });

  it('responde exactamente lo mismo exista o no la cuenta, esté confirmada, sea reciente o falle el envío', async () => {
    const cuerpos: unknown[] = [];
    for (const [i, comportamiento] of [
      () => Promise.resolve('enviado'),
      () => Promise.resolve('existente'), // sin cuenta o ya confirmada
      () => Promise.resolve('reciente'), // menos de 60 s
      () => Promise.reject(new Error('Gmail caído')),
    ].entries()) {
      mocks.reenviarConfirmacion.mockImplementationOnce(comportamiento);
      const respuesta = await pedir('Ana@Ejemplo.com', `198.51.100.${i}`);
      expect(respuesta.status).toBe(200);
      cuerpos.push(await respuesta.json());
    }
    expect(new Set(cuerpos.map((c) => JSON.stringify(c))).size).toBe(1);
    expect(cuerpos[0]).toEqual({ ok: true, datos: { mensaje: MENSAJE_REENVIO } });
    expect(mocks.reenviarConfirmacion).toHaveBeenCalledWith('ana@ejemplo.com');
  });

  it('después de 5 pedidos en la hora por conexión responde 429 con un mensaje amable', async () => {
    mocks.reenviarConfirmacion.mockResolvedValue('reciente');
    for (let i = 0; i < 5; i++) {
      expect((await pedir('ana@ejemplo.com')).status).toBe(200);
    }
    const sexto = await pedir('ana@ejemplo.com');
    expect(sexto.status).toBe(429);
    expect((await sexto.json()).error.mensaje).toMatch(/Espera un rato/);
    expect(mocks.reenviarConfirmacion).toHaveBeenCalledTimes(5);
    // Otra conexión tiene su propio cupo.
    expect((await pedir('ana@ejemplo.com', '192.0.2.1')).status).toBe(200);
  });

  it('un formato de correo inválido responde 400', async () => {
    const respuesta = await pedir('no-es-correo');
    expect(respuesta.status).toBe(400);
    expect((await respuesta.json()).error.mensaje).toBe('Introduce un correo válido.');
  });
});
