import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({ exigirSesion: vi.fn(), guardarPreferenciaAnimacion: vi.fn() }));
vi.mock('@/lib/auth/sesion', () => ({ exigirSesion: mocks.exigirSesion }));
vi.mock('@/lib/dataService', () => ({ guardarPreferenciaAnimacion: mocks.guardarPreferenciaAnimacion }));

import { POST } from './route';

const pedir = (cuerpo: unknown) =>
  POST(new Request('http://localhost/api/gym/perfil/animacion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }), undefined as never);

describe('POST /api/gym/perfil/animacion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exigirSesion.mockResolvedValue({ id: 'cuenta-a', email: 'a@example.com' });
  });

  it('guarda el nivel y la vibración de la cuenta de la sesión y deja las cookies', async () => {
    const respuesta = await pedir({ nivel: 'suaves', vibracion: false });
    expect(respuesta.status).toBe(200);
    expect(mocks.guardarPreferenciaAnimacion).toHaveBeenCalledWith('cuenta-a', 'suaves', false);
    const cookies = respuesta.headers.getSetCookie().join('\n');
    expect(cookies).toMatch(/kairos_animacion=suaves; Path=\/; .*Max-Age=31536000/);
    expect(cookies).toMatch(/kairos_vibracion=0/);
    expect(cookies).not.toMatch(/HttpOnly/i);
  });

  it('rechaza un nivel que no existe', async () => {
    const respuesta = await pedir({ nivel: 'extremas', vibracion: true });
    expect(respuesta.status).toBe(400);
    expect(mocks.guardarPreferenciaAnimacion).not.toHaveBeenCalled();
  });

  it('sin sesión responde 401', async () => {
    mocks.exigirSesion.mockRejectedValue(new ErrorDeNegocio('NO_AUTORIZADO'));
    expect((await pedir({ nivel: 'minimas', vibracion: true })).status).toBe(401);
  });
});
