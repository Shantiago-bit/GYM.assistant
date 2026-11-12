// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
  resendSend: vi.fn(),
  insertarRegistroCorreo: vi.fn(),
}));

vi.mock('nodemailer', () => ({ default: { createTransport: mocks.createTransport } }));
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: mocks.resendSend } })),
}));
vi.mock('@vercel/connect', () => ({ getToken: vi.fn() }));
vi.mock('@/lib/datos/registroCorreos', () => ({ insertarRegistroCorreo: mocks.insertarRegistroCorreo }));

import { enviarCorreo, hashDestinatario, obtenerCredencialesGmail, registrarOmision } from './correo';

const HTML =
  '<html><head><title>Asunto</title></head><body><div style="display: none; max-height: 0;">Vista previa</div>' +
  '<p>Hola &amp; bienvenido</p><a href="https://gym.example/confirmar?t=1&amp;x=2">Confirmar mi cuenta &rarr;</a></body></html>';
const datos = { para: 'Persona@Ejemplo.com', asunto: 'Asunto', html: HTML, tipo: 'confirmacion' as const, usuarioId: 'u1' };
const CLAVE = 'abcd efgh ijkl mnop';

function conGmail() {
  vi.stubEnv('GMAIL_USER', 'app@gmail.com');
  vi.stubEnv('GMAIL_APP_PASSWORD', CLAVE);
}

describe('enviarCorreo', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail });
    mocks.sendMail.mockResolvedValue({ messageId: '<id@gmail>', rejected: [] });
    mocks.resendSend.mockResolvedValue({ data: { id: 'resend-id' }, error: null });
    mocks.insertarRegistroCorreo.mockResolvedValue(undefined);
    vi.stubEnv('REGISTRO_SECRETO_IP', 'secreto-de-prueba');
    vi.stubEnv('CORREO_CONTACTO', 'soporte@ejemplo.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('usa Gmail, quita los espacios de la contraseña y registra "aceptado" con el id, sin el correo completo', async () => {
    conGmail();

    expect(await enviarCorreo(datos)).toEqual({ ok: true, id: '<id@gmail>' });
    expect(mocks.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.gmail.com',
        auth: { user: 'app@gmail.com', pass: 'abcdefghijklmnop' },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
      }),
    );
    const fila = mocks.insertarRegistroCorreo.mock.calls[0]![0];
    expect(fila).toMatchObject({
      tipo: 'confirmacion',
      usuarioId: 'u1',
      resultado: 'aceptado',
      proveedor: 'gmail',
      idMensaje: '<id@gmail>',
      destinatarioMascara: 'p•••••a@ejemplo.com',
      destinatarioHash: hashDestinatario('persona@ejemplo.com'),
    });
    expect(fila.duracionMs).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(fila)).not.toContain('persona@ejemplo.com');
    expect(JSON.stringify(fila)).not.toContain('confirmar?t=1');
    // Una línea JSON en los logs, con la máscara y nunca el correo completo.
    const linea = JSON.parse(vi.mocked(console.info).mock.calls[0]![0] as string);
    expect(linea).toMatchObject({ tipo: 'confirmacion', resultado: 'aceptado', proveedor: 'gmail', destinatario: 'p•••••a@ejemplo.com' });
  });

  it('envía también texto plano con el enlace visible, y responde a CORREO_CONTACTO', async () => {
    conGmail();
    await enviarCorreo(datos);

    const enviado = mocks.sendMail.mock.calls[0]![0];
    expect(enviado.replyTo).toBe('soporte@ejemplo.com');
    expect(enviado.html).toBe(HTML);
    expect(enviado.text).toContain('Hola & bienvenido');
    expect(enviado.text).toContain('Confirmar mi cuenta →: https://gym.example/confirmar?t=1&x=2');
    expect(enviado.text).not.toContain('<');
    expect(enviado.text).not.toContain('Vista previa');
  });

  it('reutiliza el mismo transporte entre correos (uno por credenciales)', async () => {
    vi.stubEnv('GMAIL_USER', 'otra@gmail.com');
    vi.stubEnv('GMAIL_APP_PASSWORD', 'qrst uvwx yzab cdef');
    await enviarCorreo(datos);
    await enviarCorreo(datos);
    expect(mocks.createTransport).toHaveBeenCalledTimes(1);
    expect(mocks.sendMail).toHaveBeenCalledTimes(2);
  });

  it('registra "rechazado" si Gmail rechaza el destinatario', async () => {
    conGmail();
    mocks.sendMail.mockResolvedValue({ messageId: '<x>', rejected: ['persona@ejemplo.com'] });

    expect(await enviarCorreo(datos)).toEqual({ ok: false, error: 'Gmail rechazó el destinatario.' });
    expect(mocks.insertarRegistroCorreo.mock.calls[0]![0]).toMatchObject({ resultado: 'rechazado', proveedor: 'gmail' });
    expect(console.error).toHaveBeenCalled();
  });

  it('registra "error" con el mensaje, sin la contraseña de aplicación', async () => {
    conGmail();
    mocks.sendMail.mockRejectedValue(new Error('Invalid login: 535 Username and Password not accepted (abcdefghijklmnop)'));

    const resultado = await enviarCorreo(datos);

    expect(resultado.ok).toBe(false);
    const fila = mocks.insertarRegistroCorreo.mock.calls[0]![0];
    expect(fila.resultado).toBe('error');
    expect(fila.error).toContain('Invalid login: 535');
    expect(fila.error).not.toContain('abcdefghijklmnop');
    expect(fila.error).toContain('[oculto]');
    expect(JSON.stringify(resultado)).not.toContain('abcdefghijklmnop');
    expect(String(vi.mocked(console.error).mock.calls[0]![0])).not.toContain('abcdefghijklmnop');
  });

  it('si falla la escritura del registro, el envío responde igual', async () => {
    conGmail();
    mocks.insertarRegistroCorreo.mockRejectedValue(new Error('relation "registro_correos" does not exist'));

    expect(await enviarCorreo(datos)).toEqual({ ok: true, id: '<id@gmail>' });
    expect(console.error).toHaveBeenCalledWith('No se pudo guardar el registro del correo:', expect.any(String));
  });

  it('usa Resend cuando falta alguna credencial de Gmail y lo registra como proveedor', async () => {
    vi.stubEnv('GMAIL_USER', 'app@gmail.com');
    vi.stubEnv('GMAIL_APP_PASSWORD', '');
    vi.stubEnv('RESEND_API_KEY', 're_prueba');

    expect(await enviarCorreo(datos)).toEqual({ ok: true, id: 'resend-id' });
    expect(mocks.createTransport).not.toHaveBeenCalled();
    expect(mocks.resendSend.mock.calls[0]![0].text).toContain('Confirmar mi cuenta');
    expect(mocks.insertarRegistroCorreo.mock.calls[0]![0]).toMatchObject({ resultado: 'aceptado', proveedor: 'resend', idMensaje: 'resend-id' });
  });

  it('registrarOmision deja un "omitido" con su motivo y sin proveedor', async () => {
    await registrarOmision({ tipo: 'reenvio_confirmacion', para: 'ana@ejemplo.com', usuarioId: 'u1', motivo: 'reenvio_reciente' });

    expect(mocks.insertarRegistroCorreo).toHaveBeenCalledWith(
      expect.objectContaining({ resultado: 'omitido', motivoOmision: 'reenvio_reciente', proveedor: null, usuarioId: 'u1' }),
    );
    expect(mocks.sendMail).not.toHaveBeenCalled();
    expect(JSON.parse(vi.mocked(console.info).mock.calls[0]![0] as string)).toMatchObject({
      resultado: 'omitido',
      motivo: 'reenvio_reciente',
      destinatario: 'a•••••a@ejemplo.com',
    });
  });

  it('el hash ignora mayúsculas y espacios y depende del secreto', () => {
    const base = hashDestinatario('a@b.co');
    expect(hashDestinatario('  A@B.CO ')).toBe(base);
    expect(base).toMatch(/^[0-9a-f]{64}$/);
    vi.stubEnv('REGISTRO_SECRETO_IP', 'otro-secreto');
    expect(hashDestinatario('a@b.co')).not.toBe(base);
  });

  it('no considera configurado Gmail sin usuario', () => {
    vi.stubEnv('GMAIL_USER', '');
    vi.stubEnv('GMAIL_APP_PASSWORD', 'abcdefghijklmnop');

    expect(obtenerCredencialesGmail()).toBeNull();
  });
});
