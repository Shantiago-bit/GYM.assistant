import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({ exigirSesion: vi.fn(), obtenerMensajesChatDia: vi.fn() }));
vi.mock('@/lib/auth/sesion', () => ({ exigirSesion: mocks.exigirSesion }));
vi.mock('@/lib/dataService', () => ({ obtenerMensajesChatDia: mocks.obtenerMensajesChatDia }));

import { GET } from './route';

const pedir = () => GET(new Request('http://localhost/api/gym/chat/uso'), undefined as never);

describe('GET /api/gym/chat/uso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exigirSesion.mockResolvedValue({ id: 'cuenta-a', email: 'a@example.com' });
  });
  afterEach(() => {
    delete process.env.CHAT_LIMITE_DIARIO;
  });

  it('sin sesión responde 401 y no consulta nada', async () => {
    mocks.exigirSesion.mockRejectedValue(new ErrorDeNegocio('NO_AUTORIZADO'));
    const respuesta = await pedir();
    expect(respuesta.status).toBe(401);
    expect(mocks.obtenerMensajesChatDia).not.toHaveBeenCalled();
  });

  it('devuelve los mensajes usados hoy (de la cuenta de la sesión) y el límite diario', async () => {
    mocks.obtenerMensajesChatDia.mockResolvedValue(12);
    const respuesta = await pedir();
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ usados: 12, limite: 40 });
    expect(mocks.obtenerMensajesChatDia).toHaveBeenCalledWith('cuenta-a', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    expect(respuesta.headers.get('Cache-Control')).toBe('no-store');
  });

  it('respeta CHAT_LIMITE_DIARIO si está configurado', async () => {
    process.env.CHAT_LIMITE_DIARIO = '25';
    mocks.obtenerMensajesChatDia.mockResolvedValue(0);
    expect(await (await pedir()).json()).toEqual({ usados: 0, limite: 25 });
  });
});
