// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calcularHashToken } from '@/lib/tokenRecuperacion';

const mocks = vi.hoisted(() => ({
  responderSolicitud: vi.fn(),
  eliminarCuentaConDatos: vi.fn(),
  getUserById: vi.fn(),
  generateLink: vi.fn(),
  enviarCorreo: vi.fn(),
}));

vi.mock('@/lib/dataService', () => ({
  supabaseAdmin: { auth: { admin: { getUserById: mocks.getUserById, generateLink: mocks.generateLink } } },
  responderSolicitud: mocks.responderSolicitud,
  eliminarCuentaConDatos: mocks.eliminarCuentaConDatos,
}));
vi.mock('@/lib/correo', () => ({ enviarCorreo: mocks.enviarCorreo, correoDeContacto: () => null }));
vi.mock('@/lib/urlBase', () => ({ obtenerUrlBase: () => 'https://gym.example' }));

import { POST } from './route';

const TOKEN = 'a'.repeat(64);
const responder = (cuerpo: unknown) =>
  POST(
    new Request('http://localhost/api/autorizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    }),
    undefined,
  );

describe('POST /api/autorizar (pública, solo con el token)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserById.mockResolvedValue({ data: { user: { id: 'menor-1', email: 'lu@ejemplo.com', email_confirmed_at: null } } });
    mocks.generateLink.mockResolvedValue({ data: { properties: { hashed_token: 'conf123' } }, error: null });
    mocks.enviarCorreo.mockResolvedValue({ ok: true, id: 'm1' });
    mocks.eliminarCuentaConDatos.mockResolvedValue(undefined);
  });

  it('aprobar: busca por el hash del token, habilita la cuenta y envía la confirmación normal al menor', async () => {
    mocks.responderSolicitud.mockResolvedValue({ estado: 'aprobada', usuarioId: 'menor-1' });

    const respuesta = await responder({ token: TOKEN, decision: 'aprobar' });

    expect(respuesta.status).toBe(200);
    expect(mocks.responderSolicitud).toHaveBeenCalledWith(calcularHashToken(TOKEN), 'aprobada');
    expect(mocks.generateLink).toHaveBeenCalledWith({ type: 'magiclink', email: 'lu@ejemplo.com' });
    const correo = mocks.enviarCorreo.mock.calls[0]![0];
    expect(correo.para).toBe('lu@ejemplo.com');
    expect(correo.asunto).toBe('Confirma tu cuenta de Gym Assistant');
    expect(correo.html).toContain('/auth/confirmar?token_hash=conf123&amp;type=magiclink');
    expect((await respuesta.json()).datos).toMatchObject({ estado: 'aprobada', confirmacionEnviada: true });
    expect(mocks.eliminarCuentaConDatos).not.toHaveBeenCalled();
  });

  it('aprobar una cuenta anterior ya confirmada no envía confirmación', async () => {
    mocks.responderSolicitud.mockResolvedValue({ estado: 'aprobada', usuarioId: 'menor-1' });
    mocks.getUserById.mockResolvedValue({ data: { user: { email: 'lu@ejemplo.com', email_confirmed_at: '2026-01-01T00:00:00Z' } } });

    expect((await responder({ token: TOKEN, decision: 'aprobar' })).status).toBe(200);
    expect(mocks.enviarCorreo).not.toHaveBeenCalled();
  });

  it('rechazar: elimina la cuenta con sus datos', async () => {
    mocks.responderSolicitud.mockResolvedValue({ estado: 'rechazada', usuarioId: 'menor-1' });

    const respuesta = await responder({ token: TOKEN, decision: 'rechazar' });

    expect(respuesta.status).toBe(200);
    expect(mocks.responderSolicitud).toHaveBeenCalledWith(calcularHashToken(TOKEN), 'rechazada');
    expect(mocks.eliminarCuentaConDatos).toHaveBeenCalledWith('menor-1');
    expect(mocks.enviarCorreo).not.toHaveBeenCalled();
  });

  it.each([
    ['vencido', 410, 'venció'],
    ['usado', 409, 'ya se usó'],
    ['invalido', 404, 'no es válido'],
  ])('un enlace %s responde %i con un mensaje claro y no cambia nada', async (estado, codigo, texto) => {
    mocks.responderSolicitud.mockResolvedValue({ estado });

    const respuesta = await responder({ token: TOKEN, decision: 'aprobar' });

    expect(respuesta.status).toBe(codigo);
    expect((await respuesta.json()).error.mensaje).toContain(texto);
    expect(mocks.enviarCorreo).not.toHaveBeenCalled();
    expect(mocks.eliminarCuentaConDatos).not.toHaveBeenCalled();
  });

  it('un token con otro formato es inválido sin consultar la base', async () => {
    expect((await responder({ token: 'abc', decision: 'aprobar' })).status).toBe(404);
    expect((await responder({ token: TOKEN, decision: 'tal vez' })).status).toBe(400);
    expect(mocks.responderSolicitud).not.toHaveBeenCalled();
  });
});
