import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mocks = vi.hoisted(() => ({ canjear: vi.fn() }));

vi.mock('@/lib/auth/sesion', () => ({ canjearCodigoDeConfirmacion: mocks.canjear }));

const llamar = async (consulta: string) => {
  const respuesta = await GET(new Request(`https://gym.example/auth/callback${consulta}`));
  return new URL(respuesta.headers.get('location') ?? '');
};

describe('confirmación de correo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('entra a /gym cuando el código es válido', async () => {
    mocks.canjear.mockResolvedValue(true);

    const destino = await llamar('?code=abc');

    expect(mocks.canjear).toHaveBeenCalledWith('abc');
    expect(destino.href).toBe('https://gym.example/gym');
  });

  it('pide iniciar sesión si el correo se confirmó pero no se pudo crear la sesión', async () => {
    mocks.canjear.mockResolvedValue(false);

    const destino = await llamar('?code=abc');

    expect(destino.pathname).toBe('/login');
    expect(destino.searchParams.get('mensaje')).toContain('confirmado');
  });

  it('avisa si el enlace venció', async () => {
    const destino = await llamar('?error=access_denied&error_code=otp_expired');

    expect(mocks.canjear).not.toHaveBeenCalled();
    expect(destino.pathname).toBe('/login');
    expect(destino.searchParams.get('mensaje')).toContain('venció');
  });

  it('avisa si falta el código', async () => {
    const destino = await llamar('');

    expect(mocks.canjear).not.toHaveBeenCalled();
    expect(destino.searchParams.get('mensaje')).toContain('venció');
  });
});
