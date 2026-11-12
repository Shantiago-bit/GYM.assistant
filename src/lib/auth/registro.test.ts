// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateLink: vi.fn(),
  getUserById: vi.fn(),
  buscarId: vi.fn(),
  enviarCorreo: vi.fn(),
  crearPerfil: vi.fn(),
  deleteUser: vi.fn(),
  obtenerPerfil: vi.fn(),
  registrarOmision: vi.fn(),
}));

vi.mock('@/lib/dataService', () => ({
  supabaseAdmin: {
    auth: { admin: { generateLink: mocks.generateLink, getUserById: mocks.getUserById, deleteUser: mocks.deleteUser } },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.buscarId }) }) }),
  },
  crearPerfil: mocks.crearPerfil,
  obtenerPerfil: mocks.obtenerPerfil,
}));
vi.mock('@/lib/correo', () => ({ enviarCorreo: mocks.enviarCorreo, registrarOmision: mocks.registrarOmision }));
vi.mock('@/lib/urlBase', () => ({ obtenerUrlBase: () => 'https://gym.example' }));

import { ErrorEnvioConfirmacion, enlaceDeConfirmacion, reenviarConfirmacion, registrarCuenta } from './registro';

const enlaceGenerado = (token: string) => ({ data: { properties: { hashed_token: token }, user: { id: 'nuevo' } }, error: null });
const perfil = { nombre: 'Ana Pérez', apodo: 'Anita', fechaNacimiento: '1998-04-02', genero: 'mujer' as const };
const yaRegistrado = { data: { properties: null, user: null }, error: { code: 'email_exists', status: 422, message: 'exists' } };

describe('registrarCuenta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enviarCorreo.mockResolvedValue({ ok: true, id: 'm1' });
    mocks.crearPerfil.mockResolvedValue(undefined);
    mocks.deleteUser.mockResolvedValue({ error: null });
    mocks.obtenerPerfil.mockResolvedValue(null);
  });

  it('a la cuenta de un menor que espera a su tutor no le envía la confirmación', async () => {
    mocks.generateLink.mockResolvedValue(yaRegistrado);
    mocks.buscarId.mockResolvedValue({ data: { id: 'u1' } });
    mocks.getUserById.mockResolvedValue({
      data: { user: { id: 'u1', email_confirmed_at: null, updated_at: '2026-11-01T00:00:00Z', created_at: '2026-11-01T00:00:00Z' } },
    });
    mocks.obtenerPerfil.mockResolvedValue({ autorizacion: 'pendiente' });

    expect(await registrarCuenta('nino@ejemplo.com', 'otra-clave-1', perfil)).toBe('existente');
    expect(mocks.enviarCorreo).not.toHaveBeenCalled();
    expect(mocks.generateLink).toHaveBeenCalledTimes(1);
  });

  it('crea la cuenta sin que Supabase envíe correo y manda la confirmación de la app', async () => {
    mocks.generateLink.mockResolvedValue(enlaceGenerado('abc123'));

    expect(await registrarCuenta('  Ana@Ejemplo.com ', 'secreta-123', perfil)).toBe('enviado');

    expect(mocks.generateLink).toHaveBeenCalledWith({
      type: 'signup',
      email: 'ana@ejemplo.com',
      password: 'secreta-123',
      options: { data: { full_name: 'ana' } },
    });
    const correo = mocks.enviarCorreo.mock.calls[0]![0];
    expect(correo.para).toBe('ana@ejemplo.com');
    expect(correo.asunto).toBe('Confirma tu cuenta de Gym Assistant');
    expect(correo.html).toContain('https://gym.example/auth/confirmar?token_hash=abc123&amp;type=signup');
    expect(correo.html).toContain('Confirmar mi cuenta');
    expect(correo).toMatchObject({ tipo: 'confirmacion', usuarioId: 'nuevo' });
    expect(mocks.crearPerfil).toHaveBeenCalledWith('nuevo', perfil);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it('si no se puede guardar el perfil, borra la cuenta recién creada y no envía nada', async () => {
    mocks.generateLink.mockResolvedValue(enlaceGenerado('abc'));
    mocks.crearPerfil.mockRejectedValue(new Error('fallo de la base'));

    await expect(registrarCuenta('ana@ejemplo.com', 'secreta-123', perfil)).rejects.toThrow('fallo de la base');
    expect(mocks.deleteUser).toHaveBeenCalledWith('nuevo');
    expect(mocks.enviarCorreo).not.toHaveBeenCalled();
  });

  it('si el correo ya tiene una cuenta confirmada no envía nada', async () => {
    mocks.generateLink.mockResolvedValue(yaRegistrado);
    mocks.buscarId.mockResolvedValue({ data: { id: 'u1' } });
    mocks.getUserById.mockResolvedValue({ data: { user: { email_confirmed_at: '2026-11-01T00:00:00Z' } } });

    expect(await registrarCuenta('ana@ejemplo.com', 'otra-clave-1', perfil)).toBe('existente');
    expect(mocks.enviarCorreo).not.toHaveBeenCalled();
    expect(mocks.crearPerfil).not.toHaveBeenCalled();
  });

  it('a una cuenta sin confirmar le reenvía la confirmación, sin cambiar su contraseña', async () => {
    mocks.generateLink.mockResolvedValueOnce(yaRegistrado).mockResolvedValueOnce(enlaceGenerado('xyz'));
    mocks.buscarId.mockResolvedValue({ data: { id: 'u1' } });
    mocks.getUserById.mockResolvedValue({
      data: { user: { id: 'u1', email_confirmed_at: null, updated_at: '2026-11-01T00:00:00Z', created_at: '2026-11-01T00:00:00Z' } },
    });

    expect(await registrarCuenta('ana@ejemplo.com', 'otra-clave-1', perfil)).toBe('enviado');
    expect(mocks.generateLink).toHaveBeenLastCalledWith({ type: 'magiclink', email: 'ana@ejemplo.com' });
    expect(mocks.enviarCorreo.mock.calls[0]![0].html).toContain('token_hash=xyz&amp;type=magiclink');
  });

  it('no reenvía a la misma cuenta antes de un minuto', async () => {
    mocks.generateLink.mockResolvedValue(yaRegistrado);
    mocks.buscarId.mockResolvedValue({ data: { id: 'u1' } });
    mocks.getUserById.mockResolvedValue({ data: { user: { id: 'u1', email_confirmed_at: null, updated_at: new Date().toISOString() } } });

    expect(await registrarCuenta('ana@ejemplo.com', 'otra-clave-1', perfil)).toBe('reciente');
    expect(mocks.enviarCorreo).not.toHaveBeenCalled();
  });

  it('avisa si el correo no se pudo enviar', async () => {
    mocks.generateLink.mockResolvedValue(enlaceGenerado('abc'));
    mocks.enviarCorreo.mockResolvedValue({ ok: false, error: 'Gmail caído' });

    await expect(registrarCuenta('ana@ejemplo.com', 'secreta-123', perfil)).rejects.toBeInstanceOf(ErrorEnvioConfirmacion);
    expect(mocks.deleteUser).toHaveBeenCalledWith('nuevo');
  });

  it('arma el enlace hacia la ruta de confirmación de la app', () => {
    expect(enlaceDeConfirmacion('a/b+c', 'signup')).toBe('https://gym.example/auth/confirmar?token_hash=a%2Fb%2Bc&type=signup');
  });
});

describe('registro de omisiones (la respuesta a la persona no cambia)', () => {
  const cuentaSinConfirmar = (extra: Record<string, unknown> = {}) => ({
    data: { user: { id: 'u1', email_confirmed_at: null, updated_at: '2026-11-01T00:00:00Z', created_at: '2026-11-01T00:00:00Z', ...extra } },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateLink.mockResolvedValue(yaRegistrado);
    mocks.buscarId.mockResolvedValue({ data: { id: 'u1' } });
    mocks.obtenerPerfil.mockResolvedValue(null);
    mocks.enviarCorreo.mockResolvedValue({ ok: true, id: 'm1' });
  });

  it.each([
    ['cuenta_confirmada', cuentaSinConfirmar({ email_confirmed_at: '2026-11-01T00:00:00Z' }), null, 'existente'],
    ['reenvio_reciente', cuentaSinConfirmar({ updated_at: new Date().toISOString() }), null, 'reciente'],
    ['menor_pendiente', cuentaSinConfirmar(), { autorizacion: 'pendiente' }, 'existente'],
    ['menor_rechazado', cuentaSinConfirmar(), { autorizacion: 'rechazada' }, 'existente'],
  ])('registra el omitido "%s" sin enviar nada', async (motivo, cuenta, perfilExistente, resultado) => {
    mocks.getUserById.mockResolvedValue(cuenta);
    mocks.obtenerPerfil.mockResolvedValue(perfilExistente);

    expect(await registrarCuenta('Ana@Ejemplo.com', 'otra-clave-1', perfil)).toBe(resultado);
    expect(mocks.registrarOmision).toHaveBeenCalledWith({
      tipo: 'reenvio_confirmacion',
      para: 'ana@ejemplo.com',
      usuarioId: 'u1',
      motivo,
    });
    expect(mocks.enviarCorreo).not.toHaveBeenCalled();
  });

  it('el reenvío real queda como reenvio_confirmacion de esa cuenta', async () => {
    mocks.getUserById.mockResolvedValue(cuentaSinConfirmar());
    mocks.generateLink.mockResolvedValue(enlaceGenerado('xyz'));

    expect(await reenviarConfirmacion('ana@ejemplo.com')).toBe('enviado');
    expect(mocks.enviarCorreo.mock.calls[0]![0]).toMatchObject({ tipo: 'reenvio_confirmacion', usuarioId: 'u1' });
    expect(mocks.registrarOmision).not.toHaveBeenCalled();
  });

  it('sin cuenta no registra nada (no deja rastro de qué correos se probaron)', async () => {
    mocks.buscarId.mockResolvedValue({ data: null });
    expect(await reenviarConfirmacion('nadie@ejemplo.com')).toBe('existente');
    expect(mocks.registrarOmision).not.toHaveBeenCalled();
    expect(mocks.enviarCorreo).not.toHaveBeenCalled();
  });

  it('una dirección que Supabase rechaza no se toma como cuenta existente', async () => {
    mocks.generateLink.mockResolvedValue({
      data: { properties: null, user: null },
      error: { code: 'email_address_invalid', status: 422, message: 'Email address is invalid' },
    });

    await expect(registrarCuenta('raro@ejemplo.com', 'secreta-123', perfil)).rejects.toMatchObject({
      codigo: 'DATOS_INVALIDOS',
      message: expect.stringContaining('No podemos usar ese correo'),
    });
    expect(mocks.buscarId).not.toHaveBeenCalled();
  });
});
