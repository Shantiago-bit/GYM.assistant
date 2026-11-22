import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({
  exigirSesion: vi.fn(),
  crearClienteChat: vi.fn(),
  registrarMensajeChat: vi.fn(),
  interpretarConChrono: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirSesion: mocks.exigirSesion }));
vi.mock('@/lib/datos/chat', () => ({ registrarMensajeChat: mocks.registrarMensajeChat }));
vi.mock('@/lib/chat/asistente', () => ({ crearClienteChat: mocks.crearClienteChat }));
vi.mock('@/lib/chat/interpretar', () => ({ interpretarConChrono: mocks.interpretarConChrono }));

import { POST } from './route';

const pedido = (cuerpo: unknown) =>
  new Request('http://localhost/api/gym/interpretar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });

describe('POST /api/gym/interpretar ("Que CHRONO lo interprete")', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exigirSesion.mockResolvedValue({ id: 'cuenta-a', email: 'a@example.com' });
    mocks.crearClienteChat.mockReturnValue({});
    mocks.registrarMensajeChat.mockResolvedValue(true);
    mocks.interpretarConChrono.mockResolvedValue({
      ok: true,
      series: [{ reps: 10, pesoGramos: 40000, rir: null, tecnica: 'normal' }],
      avisos: [],
    });
  });

  it('sin sesión responde 401 y no llama a CHRONO', async () => {
    mocks.exigirSesion.mockRejectedValue(new ErrorDeNegocio('NO_AUTORIZADO'));
    const respuesta = await POST(pedido({ texto: 'diez con cuarenta', tipo: 'peso' }), undefined);
    expect(respuesta.status).toBe(401);
    expect(mocks.interpretarConChrono).not.toHaveBeenCalled();
  });

  it('envía solo la frase, el tipo y el peso actual, cuenta un mensaje del límite y devuelve las series sin guardar', async () => {
    const respuesta = await POST(pedido({ texto: 'hice diez con cuarenta', tipo: 'peso', pesoActualKg: 40 }), undefined);
    expect(respuesta.status).toBe(200);
    expect((await respuesta.json()).datos.series).toHaveLength(1);
    expect(mocks.registrarMensajeChat).toHaveBeenCalledTimes(1);
    expect(mocks.interpretarConChrono).toHaveBeenCalledWith({}, 'hice diez con cuarenta', { tipo: 'peso', pesoActualGramos: 40000 });
  });

  it('con el límite diario agotado no llama a CHRONO', async () => {
    mocks.registrarMensajeChat.mockResolvedValue(false);
    const respuesta = await POST(pedido({ texto: 'diez', tipo: 'calistenia' }), undefined);
    expect(respuesta.status).toBe(429);
    expect(mocks.interpretarConChrono).not.toHaveBeenCalled();
  });

  it('valida la entrada: texto vacío o de más de 300 caracteres', async () => {
    expect((await POST(pedido({ texto: '  ', tipo: 'peso' }), undefined)).status).toBe(400);
    expect((await POST(pedido({ texto: 'a'.repeat(301), tipo: 'peso' }), undefined)).status).toBe(400);
    expect(mocks.registrarMensajeChat).not.toHaveBeenCalled();
  });

  it('si CHRONO tampoco entiende, responde el error para mostrarlo', async () => {
    mocks.interpretarConChrono.mockResolvedValue({ ok: false, error: 'CHRONO tampoco pudo leer esas series.' });
    const respuesta = await POST(pedido({ texto: 'hola', tipo: 'peso' }), undefined);
    expect(respuesta.status).toBe(400);
    expect((await respuesta.json()).error.mensaje).toMatch(/CHRONO tampoco/);
  });
});
