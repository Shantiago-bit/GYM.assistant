// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  getUserById: vi.fn(),
  generateLink: vi.fn(),
  buscarId: vi.fn(),
  crearPerfil: vi.fn(),
  obtenerPerfil: vi.fn(),
  crearSolicitud: vi.fn(),
  obtenerSolicitudPendiente: vi.fn(),
  solicitudEnPlazo: vi.fn(),
  enviarCorreo: vi.fn(),
  registrarOmision: vi.fn(),
}));

vi.mock('@/lib/dataService', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: mocks.createUser,
        deleteUser: mocks.deleteUser,
        getUserById: mocks.getUserById,
        generateLink: mocks.generateLink,
      },
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.buscarId }) }) }),
  },
  crearPerfil: mocks.crearPerfil,
  obtenerPerfil: mocks.obtenerPerfil,
  crearSolicitud: mocks.crearSolicitud,
  obtenerSolicitudPendiente: mocks.obtenerSolicitudPendiente,
  solicitudEnPlazo: mocks.solicitudEnPlazo,
  responderSolicitud: vi.fn(),
  eliminarCuentaConDatos: vi.fn(),
}));
vi.mock('@/lib/correo', () => ({
  enviarCorreo: mocks.enviarCorreo,
  registrarOmision: mocks.registrarOmision,
  correoDeContacto: () => 'soporte@ejemplo.com',
}));
vi.mock('@/lib/urlBase', () => ({ obtenerUrlBase: () => 'https://gym.example' }));

import { ErrorEnvioTutor, reenviarSolicitud, registrarCuentaMenor } from './autorizacionTutor';

const anio = new Date().getFullYear();
const PERFIL = { nombre: 'Lucía Pérez', apodo: 'Lu', fechaNacimiento: `${anio - 10}-01-01`, genero: 'mujer' as const };
const yaExiste = { data: { user: null }, error: { code: 'email_exists', status: 422, message: 'exists' } };

describe('registrarCuentaMenor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createUser.mockResolvedValue({ data: { user: { id: 'menor-1' } }, error: null });
    mocks.crearSolicitud.mockResolvedValue({ venceDia: '2026-11-18' });
    mocks.enviarCorreo.mockResolvedValue({ ok: true, id: 'm1' });
    mocks.deleteUser.mockResolvedValue({ error: null });
  });

  it('crea la cuenta sin confirmar, el perfil pendiente y escribe solo al tutor', async () => {
    expect(await registrarCuentaMenor(' Lu@Ejemplo.com ', 'clave-segura-1', PERFIL, 'mama@ejemplo.com')).toBe('enviado');

    expect(mocks.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'lu@ejemplo.com', password: 'clave-segura-1', email_confirm: false }),
    );
    expect(mocks.crearPerfil).toHaveBeenCalledWith('menor-1', PERFIL, 'pendiente');
    // Se guarda el hash del token (64 hex), nunca el token.
    const [usuario, tutor, hash] = mocks.crearSolicitud.mock.calls[0]!;
    expect([usuario, tutor]).toEqual(['menor-1', 'mama@ejemplo.com']);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);

    expect(mocks.enviarCorreo).toHaveBeenCalledTimes(1);
    const correo = mocks.enviarCorreo.mock.calls[0]![0];
    expect(correo.para).toBe('mama@ejemplo.com');
    expect(correo).toMatchObject({ tipo: 'autorizacion_tutor', usuarioId: 'menor-1' });
    expect(correo.asunto).toBe('Lu quiere crear una cuenta en Gym Assistant: necesitamos tu autorización');
    const token = /autorizar\/([0-9a-f]{64})/.exec(correo.html)?.[1];
    expect(token).toBeDefined();
    expect(token).not.toBe(hash);
    expect(correo.html).toContain('18 de noviembre de 2026');
    expect(mocks.generateLink).not.toHaveBeenCalled();
  });

  it('si el correo al tutor falla, borra la cuenta nueva', async () => {
    mocks.enviarCorreo.mockResolvedValue({ ok: false, error: 'Gmail caído' });

    await expect(registrarCuentaMenor('lu@ejemplo.com', 'clave-segura-1', PERFIL, 'mama@ejemplo.com')).rejects.toBeInstanceOf(
      ErrorEnvioTutor,
    );
    expect(mocks.deleteUser).toHaveBeenCalledWith('menor-1');
  });

  it('con un correo que ya tiene cuenta responde igual y, si es un menor pendiente, reenvía a su tutor', async () => {
    mocks.createUser.mockResolvedValue(yaExiste);
    mocks.buscarId.mockResolvedValue({ data: { id: 'menor-1' } });
    mocks.getUserById.mockResolvedValue({ data: { user: { id: 'menor-1', email: 'lu@ejemplo.com', email_confirmed_at: null } } });
    mocks.obtenerPerfil.mockResolvedValue({ ...PERFIL, apodo: 'Lu', autorizacion: 'pendiente' });
    mocks.obtenerSolicitudPendiente.mockResolvedValue({ correoTutor: 'papa@ejemplo.com', venceDia: '2026-11-18', reenviosHoy: 0 });
    mocks.solicitudEnPlazo.mockResolvedValue(true);

    expect(await registrarCuentaMenor('lu@ejemplo.com', 'otra-clave-1', PERFIL, 'otro@ejemplo.com')).toBe('existente');
    // Va a la dirección guardada, no a la que se escribió ahora.
    expect(mocks.enviarCorreo.mock.calls[0]![0].para).toBe('papa@ejemplo.com');
    expect(mocks.crearPerfil).not.toHaveBeenCalled();
  });

  it('con un correo de una cuenta confirmada no envía nada', async () => {
    mocks.createUser.mockResolvedValue(yaExiste);
    mocks.buscarId.mockResolvedValue({ data: { id: 'adulto-1' } });
    mocks.getUserById.mockResolvedValue({ data: { user: { id: 'adulto-1', email_confirmed_at: '2026-01-01T00:00:00Z' } } });

    expect(await registrarCuentaMenor('ana@ejemplo.com', 'otra-clave-1', PERFIL, 'mama@ejemplo.com')).toBe('existente');
    expect(mocks.enviarCorreo).not.toHaveBeenCalled();
    expect(mocks.registrarOmision).toHaveBeenCalledWith({
      tipo: 'autorizacion_tutor',
      para: 'ana@ejemplo.com',
      usuarioId: 'adulto-1',
      motivo: 'cuenta_confirmada',
    });
  });
});

describe('reenviarSolicitud', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.obtenerPerfil.mockResolvedValue({ ...PERFIL, autorizacion: 'pendiente' });
    mocks.getUserById.mockResolvedValue({ data: { user: { email: 'lu@ejemplo.com' } } });
    mocks.solicitudEnPlazo.mockResolvedValue(true);
    mocks.crearSolicitud.mockResolvedValue({ venceDia: '2026-11-18' });
    mocks.enviarCorreo.mockResolvedValue({ ok: true, id: 'm1' });
  });

  it('reenvía a la misma dirección con un enlace nuevo y dice cuántos quedan', async () => {
    mocks.obtenerSolicitudPendiente.mockResolvedValue({ correoTutor: 'mama@ejemplo.com', venceDia: '2026-11-18', reenviosHoy: 1 });

    expect(await reenviarSolicitud('menor-1')).toEqual({ restantes: 1 });
    expect(mocks.enviarCorreo.mock.calls[0]![0]).toMatchObject({ para: 'mama@ejemplo.com', tipo: 'reenvio_tutor' });
  });

  it('no pasa de 3 reenvíos por día', async () => {
    mocks.obtenerSolicitudPendiente.mockResolvedValue({ correoTutor: 'mama@ejemplo.com', venceDia: '2026-11-18', reenviosHoy: 3 });

    await expect(reenviarSolicitud('menor-1')).rejects.toMatchObject({ codigo: 'REENVIOS_AGOTADOS' });
    expect(mocks.enviarCorreo).not.toHaveBeenCalled();
  });

  it('fuera de plazo ya no reenvía', async () => {
    mocks.obtenerSolicitudPendiente.mockResolvedValue({ correoTutor: 'mama@ejemplo.com', venceDia: '2026-11-18', reenviosHoy: 0 });
    mocks.solicitudEnPlazo.mockResolvedValue(false);

    await expect(reenviarSolicitud('menor-1')).rejects.toMatchObject({ codigo: 'AUTORIZACION_VENCIDA' });
  });

  it('sin solicitud pendiente responde 400', async () => {
    mocks.obtenerSolicitudPendiente.mockResolvedValue(null);
    await expect(reenviarSolicitud('adulto-1')).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });
});
