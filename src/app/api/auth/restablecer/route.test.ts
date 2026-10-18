import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  actualizarContrasena: vi.fn(),
  buscarTokenVigentePorHash: vi.fn(),
  invalidarTokensPendientesPorUsuario: vi.fn(),
  marcarTokenComoUsado: vi.fn(),
}));

vi.mock('@/lib/dataService', () => ({
  actualizarContrasena: mocks.actualizarContrasena,
  buscarTokenVigentePorHash: mocks.buscarTokenVigentePorHash,
  invalidarTokensPendientesPorUsuario: mocks.invalidarTokensPendientesPorUsuario,
  marcarTokenComoUsado: mocks.marcarTokenComoUsado,
}));
vi.mock('@/lib/tokenRecuperacion', () => ({ calcularHashToken: () => 'token-hash' }));

import { POST } from './route';

function crearSolicitud(token = 'a'.repeat(64)) {
  return new Request('http://localhost/api/auth/restablecer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      contrasena: 'NuevaClaveSegura123',
      confirmacion: 'NuevaClaveSegura123',
    }),
  });
}

describe('POST /api/auth/restablecer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buscarTokenVigentePorHash.mockResolvedValue({ id: 'token-id', usuario_id: 'user-id' });
    mocks.actualizarContrasena.mockResolvedValue(undefined);
    mocks.marcarTokenComoUsado.mockResolvedValue(undefined);
    mocks.invalidarTokensPendientesPorUsuario.mockResolvedValue(undefined);
  });

  it('actualiza la contraseña con un token válido y lo invalida', async () => {
    const response = await POST(crearSolicitud());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mensaje).toBe('Contraseña actualizada correctamente.');
    expect(mocks.actualizarContrasena).toHaveBeenCalledWith('user-id', 'NuevaClaveSegura123');
    expect(mocks.marcarTokenComoUsado).toHaveBeenCalledWith('token-id');
    expect(mocks.invalidarTokensPendientesPorUsuario).toHaveBeenCalledWith('user-id');
  });

  it('rechaza un token vencido o inexistente sin cambiar la contraseña', async () => {
    mocks.buscarTokenVigentePorHash.mockResolvedValue(null);

    const response = await POST(crearSolicitud());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.mensaje).toBe('El enlace no es válido o ya venció.');
    expect(mocks.actualizarContrasena).not.toHaveBeenCalled();
  });
});