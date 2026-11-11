// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ verificarEnlaceDeCorreo: vi.fn() }));

vi.mock('@/lib/auth/sesion', () => ({ verificarEnlaceDeCorreo: mocks.verificarEnlaceDeCorreo }));

import { GET } from './route';

const pedir = (consulta: string) => GET(new Request(`https://gym.example/auth/confirmar${consulta}`));

describe('GET /auth/confirmar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('con un enlace válido confirma la cuenta y entra a /gym', async () => {
    mocks.verificarEnlaceDeCorreo.mockResolvedValue(true);

    const respuesta = await pedir('?token_hash=abc&type=signup');

    expect(mocks.verificarEnlaceDeCorreo).toHaveBeenCalledWith('abc', 'signup');
    expect(respuesta.headers.get('location')).toBe('https://gym.example/gym');
  });

  it('con un enlace vencido lleva al login con un aviso', async () => {
    mocks.verificarEnlaceDeCorreo.mockResolvedValue(false);

    const destino = new URL((await pedir('?token_hash=abc&type=magiclink')).headers.get('location')!);

    expect(destino.pathname).toBe('/login');
    expect(destino.searchParams.get('mensaje')).toMatch(/no es válido o ya venció/);
  });

  it('rechaza enlaces incompletos o de otro tipo sin consultar a Supabase', async () => {
    for (const consulta of ['', '?token_hash=abc', '?type=signup', '?token_hash=abc&type=recovery']) {
      expect(new URL((await pedir(consulta)).headers.get('location')!).pathname).toBe('/login');
    }
    expect(mocks.verificarEnlaceDeCorreo).not.toHaveBeenCalled();
  });
});
