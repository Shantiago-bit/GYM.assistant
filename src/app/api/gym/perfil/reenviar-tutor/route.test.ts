// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const mocks = vi.hoisted(() => ({ exigirSesionAunSinAutorizar: vi.fn(), reenviarSolicitud: vi.fn() }));

vi.mock('@/lib/auth/sesion', () => ({ exigirSesionAunSinAutorizar: mocks.exigirSesionAunSinAutorizar }));
vi.mock('@/lib/auth/autorizacionTutor', () => ({
  reenviarSolicitud: mocks.reenviarSolicitud,
  ErrorEnvioTutor: class ErrorEnvioTutor extends Error {},
}));

import { POST } from './route';

const pedir = () => POST(new Request('http://localhost/api/gym/perfil/reenviar-tutor', { method: 'POST' }), undefined);

describe('POST /api/gym/perfil/reenviar-tutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exigirSesionAunSinAutorizar.mockResolvedValue({ id: 'menor-1', email: 'lu@ejemplo.com' });
  });

  it('sin sesión responde 401', async () => {
    mocks.exigirSesionAunSinAutorizar.mockRejectedValue(new ErrorDeNegocio('NO_AUTORIZADO'));
    expect((await pedir()).status).toBe(401);
    expect(mocks.reenviarSolicitud).not.toHaveBeenCalled();
  });

  it('reenvía la solicitud de la cuenta de la sesión (aunque esté pendiente)', async () => {
    mocks.reenviarSolicitud.mockResolvedValue({ restantes: 2 });
    const respuesta = await pedir();

    expect(respuesta.status).toBe(200);
    expect((await respuesta.json()).datos).toEqual({ restantes: 2 });
    expect(mocks.reenviarSolicitud).toHaveBeenCalledWith('menor-1');
  });

  it('al cuarto reenvío del día responde 429', async () => {
    mocks.reenviarSolicitud.mockRejectedValue(new ErrorDeNegocio('REENVIOS_AGOTADOS'));
    expect((await pedir()).status).toBe(429);
  });
});
