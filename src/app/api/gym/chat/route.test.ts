import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  exigirSesion: vi.fn(),
  crearClienteChat: vi.fn(),
  responderChat: vi.fn(),
  registrarMensajeChat: vi.fn(),
  obtenerPerfil: vi.fn(),
}));

vi.mock('@/lib/auth/sesion', () => ({ exigirSesion: mocks.exigirSesion }));
vi.mock('@/lib/datos/chat', () => ({ registrarMensajeChat: mocks.registrarMensajeChat }));
vi.mock('@/lib/datos/perfil', () => ({ obtenerPerfil: mocks.obtenerPerfil }));
vi.mock('@/lib/chat/asistente', () => ({
  crearClienteChat: mocks.crearClienteChat,
  responderChat: mocks.responderChat,
  mensajeDeErrorChat: () => 'Ocurrió un error al responder. Intenta de nuevo.',
}));

import { POST } from './route';

function pedido(cuerpo: unknown) {
  return new Request('http://localhost/api/gym/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
}

const valido = { mensajes: [{ rol: 'usuario', texto: '¿Cómo voy?' }] };

async function eventos(respuesta: Response) {
  return (await respuesta.text())
    .trim()
    .split('\n')
    .map((linea) => JSON.parse(linea));
}

describe('POST /api/gym/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mocks.exigirSesion.mockResolvedValue({ id: 'cuenta-a', email: 'a@ejemplo.com' });
    mocks.crearClienteChat.mockReturnValue({});
    mocks.registrarMensajeChat.mockResolvedValue(true);
    mocks.obtenerPerfil.mockResolvedValue(null);
  });

  it('a CHRONO le pasa solo el apodo, la edad y si hoy es el cumpleaños', async () => {
    mocks.obtenerPerfil.mockResolvedValue({
      usuarioId: 'cuenta-a',
      nombre: 'Santiago Carbono',
      apodo: 'Santi',
      fechaNacimiento: '2000-01-01',
      genero: 'hombre',
      avatarRuta: null,
      autorizacion: 'no_requerida',
      cumpleVistoAnio: null,
      miembroDesde: '2026-01-01',
    });
    mocks.responderChat.mockResolvedValue(undefined);

    await (await POST(pedido(valido), undefined)).text();

    const { persona } = mocks.responderChat.mock.calls[0]![0];
    expect(Object.keys(persona).sort()).toEqual(['cumpleanosHoy', 'edad', 'nombre']);
    expect(persona.nombre).toBe('Santi');
    expect(persona.edad).toBeGreaterThanOrEqual(26);
    expect(mocks.obtenerPerfil).toHaveBeenCalledWith('cuenta-a');
  });

  it('transmite la respuesta como una línea JSON por evento', async () => {
    mocks.responderChat.mockImplementation(async ({ emitir }) => {
      emitir({ tipo: 'texto', texto: 'Vas bien.' });
    });

    const respuesta = await POST(pedido(valido), undefined);

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('Content-Type')).toContain('application/x-ndjson');
    expect(await eventos(respuesta)).toEqual([{ tipo: 'texto', texto: 'Vas bien.' }, { tipo: 'fin' }]);
    expect(mocks.responderChat).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 'cuenta-a', historial: valido.mensajes }),
    );
  });

  it('envía un evento de error si falla a mitad de la respuesta', async () => {
    mocks.responderChat.mockRejectedValue(new Error('caída'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const respuesta = await POST(pedido(valido), undefined);

    expect(await eventos(respuesta)).toEqual([
      { tipo: 'error', mensaje: 'Ocurrió un error al responder. Intenta de nuevo.' },
    ]);
  });

  it('responde 429 al llegar al límite diario', async () => {
    mocks.registrarMensajeChat.mockResolvedValue(false);

    const respuesta = await POST(pedido(valido), undefined);

    expect(respuesta.status).toBe(429);
    expect(mocks.responderChat).not.toHaveBeenCalled();
  });

  it('usa el límite diario de CHAT_LIMITE_DIARIO', async () => {
    vi.stubEnv('CHAT_LIMITE_DIARIO', '5');
    mocks.responderChat.mockResolvedValue(undefined);

    await (await POST(pedido(valido), undefined)).text();

    expect(mocks.registrarMensajeChat).toHaveBeenCalledWith('cuenta-a', expect.any(String), 5);
  });

  it('responde 503 si falta la clave de Groq', async () => {
    mocks.crearClienteChat.mockReturnValue(null);

    const respuesta = await POST(pedido(valido), undefined);

    expect(respuesta.status).toBe(503);
    expect(mocks.registrarMensajeChat).not.toHaveBeenCalled();
  });

  it('rechaza un historial que no termina con la persona', async () => {
    const respuesta = await POST(
      pedido({ mensajes: [{ rol: 'usuario', texto: 'Hola' }, { rol: 'asistente', texto: 'Hola' }] }),
      undefined,
    );

    expect(respuesta.status).toBe(400);
  });

  it('rechaza un mensaje demasiado largo', async () => {
    const respuesta = await POST(pedido({ mensajes: [{ rol: 'usuario', texto: 'a'.repeat(2001) }] }), undefined);

    expect(respuesta.status).toBe(400);
  });
});
