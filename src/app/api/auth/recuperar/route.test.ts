import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  buscarUsuarioPorEmail: vi.fn(),
  contarSolicitudesRecuperacion: vi.fn(),
  crearTokenRecuperacion: vi.fn(),
  enviarCorreo: vi.fn(),
  invalidarTokensPendientesPorUsuario: vi.fn(),
  marcarTokenComoUsado: vi.fn(),
  plantillaRecuperacion: vi.fn(),
}));

vi.mock('@/lib/correo', () => ({ enviarCorreo: mocks.enviarCorreo }));
vi.mock('@/lib/dataService', () => ({
  buscarUsuarioPorEmail: mocks.buscarUsuarioPorEmail,
  contarSolicitudesRecuperacion: mocks.contarSolicitudesRecuperacion,
  crearTokenRecuperacion: mocks.crearTokenRecuperacion,
  invalidarTokensPendientesPorUsuario: mocks.invalidarTokensPendientesPorUsuario,
  marcarTokenComoUsado: mocks.marcarTokenComoUsado,
}));
vi.mock('@/lib/plantillasCorreo', () => ({ plantillaRecuperacion: mocks.plantillaRecuperacion }));
vi.mock('@/lib/tokenRecuperacion', () => ({
  calcularHashToken: () => 'token-hash',
  generarToken: () => 'a'.repeat(64),
}));
vi.mock('@/lib/urlBase', () => ({ obtenerUrlBase: () => 'http://localhost:3000' }));

import { POST } from './route';

function crearSolicitud(email = 'santiago@example.com') {
  return new Request('http://localhost/api/auth/recuperar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

describe('POST /api/auth/recuperar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buscarUsuarioPorEmail.mockResolvedValue({ id: 'user-id', email: 'santiago@example.com' });
    mocks.contarSolicitudesRecuperacion.mockResolvedValue(0);
    mocks.crearTokenRecuperacion.mockResolvedValue({ id: 'new-token-id' });
    mocks.enviarCorreo.mockResolvedValue({ ok: true, id: 'email-id' });
    mocks.plantillaRecuperacion.mockImplementation((url: string) => `link:${url}`);
  });

  it('envía un enlace al usuario y solo entonces invalida los tokens anteriores', async () => {
    const response = await POST(crearSolicitud());

    expect(response.status).toBe(200);
    expect(mocks.enviarCorreo).toHaveBeenCalledWith(
      expect.objectContaining({
        para: 'santiago@example.com',
        html: `link:http://localhost:3000/restablecer-contrasena?token=${'a'.repeat(64)}`,
      }),
    );
    expect(mocks.invalidarTokensPendientesPorUsuario).toHaveBeenCalledWith(
      'user-id',
      'new-token-id',
    );
    expect(mocks.marcarTokenComoUsado).not.toHaveBeenCalled();
  });

  it('invalida el token nuevo si Resend no acepta el correo', async () => {
    mocks.enviarCorreo.mockResolvedValue({ ok: false, error: 'Resend no disponible' });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const response = await POST(crearSolicitud());

      expect(response.status).toBe(200);
      expect(mocks.marcarTokenComoUsado).toHaveBeenCalledWith('new-token-id');
      expect(mocks.invalidarTokensPendientesPorUsuario).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('mantiene una respuesta genérica y registra un error si falta la tabla', async () => {
    mocks.buscarUsuarioPorEmail.mockRejectedValue({
      code: 'PGRST205',
      message: "Could not find the table 'public.restablecimientos_contrasena' in the schema cache",
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const response = await POST(crearSolicitud());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.mensaje).toBe(
        'Si el correo está registrado, recibirás un enlace para restablecer la contraseña.',
      );
      expect(mocks.enviarCorreo).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        'Error procesando solicitud de recuperación de contraseña:',
        { etapa: 'buscar usuario', codigo: 'PGRST205' },
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});