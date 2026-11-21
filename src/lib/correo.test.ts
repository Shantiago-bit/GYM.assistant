// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
  resendSend: vi.fn(),
  insertarRegistroCorreo: vi.fn(),
  reportarAviso: vi.fn(),
}));

vi.mock('@/lib/monitoreo/reportar', () => ({ reportarAviso: mocks.reportarAviso }));

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

  describe('proveedor y segundo intento', () => {
    const REMITENTE = 'Gym Assistant <no-responder@midominio.example>';
    const conResendPropio = () => {
      vi.stubEnv('RESEND_API_KEY', 're_prueba');
      vi.stubEnv('RESEND_FROM', REMITENTE);
    };
    const filas = () => mocks.insertarRegistroCorreo.mock.calls.map(([fila]) => fila);
    const errorDeGmail = (codigo: string, respuesta?: number) =>
      Object.assign(new Error(`Fallo ${codigo}`), { code: codigo, ...(respuesta ? { responseCode: respuesta } : {}) });

    it("'auto' con dominio propio en RESEND_FROM usa Resend con ese remitente y responde a CORREO_CONTACTO", async () => {
      conGmail();
      conResendPropio();

      expect(await enviarCorreo(datos)).toEqual({ ok: true, id: 'resend-id' });
      expect(mocks.resendSend.mock.calls[0]![0]).toMatchObject({ from: REMITENTE, replyTo: 'soporte@ejemplo.com' });
      expect(mocks.sendMail).not.toHaveBeenCalled();
      expect(filas()).toEqual([expect.objectContaining({ proveedor: 'resend', resultado: 'aceptado' })]);
    });

    it("'auto' sin dominio propio usa Gmail aunque haya clave de Resend", async () => {
      conGmail();
      vi.stubEnv('RESEND_API_KEY', 're_prueba');
      vi.stubEnv('RESEND_FROM', 'onboarding@resend.dev');

      expect(await enviarCorreo(datos)).toEqual({ ok: true, id: '<id@gmail>' });
      expect(mocks.resendSend).not.toHaveBeenCalled();
    });

    it("CORREO_PROVEEDOR='gmail' usa Gmail aunque Resend tenga dominio propio", async () => {
      conGmail();
      conResendPropio();
      vi.stubEnv('CORREO_PROVEEDOR', 'gmail');

      expect(await enviarCorreo(datos)).toEqual({ ok: true, id: '<id@gmail>' });
      expect(mocks.resendSend).not.toHaveBeenCalled();
    });

    it("CORREO_PROVEEDOR='resend' usa Resend aunque Gmail esté configurado", async () => {
      conGmail();
      conResendPropio();
      vi.stubEnv('CORREO_PROVEEDOR', 'resend');

      expect(await enviarCorreo(datos)).toEqual({ ok: true, id: 'resend-id' });
      expect(mocks.sendMail).not.toHaveBeenCalled();
    });

    it('si Gmail rechaza las credenciales (antes de aceptar), intenta una vez con Resend y registra los dos intentos', async () => {
      conGmail();
      conResendPropio();
      vi.stubEnv('CORREO_PROVEEDOR', 'gmail');
      mocks.sendMail.mockRejectedValue(errorDeGmail('EAUTH', 535));

      expect(await enviarCorreo(datos)).toEqual({ ok: true, id: 'resend-id' });
      expect(mocks.sendMail).toHaveBeenCalledTimes(1);
      expect(mocks.resendSend).toHaveBeenCalledTimes(1);
      expect(filas()).toEqual([
        expect.objectContaining({ proveedor: 'gmail', resultado: 'error' }),
        expect.objectContaining({ proveedor: 'resend', resultado: 'aceptado', idMensaje: 'resend-id' }),
      ]);
    });

    it('si Resend no tiene conexión, intenta una vez con Gmail; si ambos fallan, no hay un tercer intento', async () => {
      conGmail();
      conResendPropio();
      mocks.resendSend.mockResolvedValue({ data: null, error: { name: 'application_error', statusCode: null, message: 'fetch failed' } });
      mocks.sendMail.mockRejectedValue(errorDeGmail('ECONNECTION'));

      const resultado = await enviarCorreo(datos);

      expect(resultado.ok).toBe(false);
      expect(mocks.resendSend).toHaveBeenCalledTimes(1);
      expect(mocks.sendMail).toHaveBeenCalledTimes(1);
      expect(filas().map((fila) => [fila.proveedor, fila.resultado])).toEqual([
        ['resend', 'error'],
        ['gmail', 'error'],
      ]);
    });

    it('si el primero ya aceptó el correo o lo rechazó después de recibirlo, nunca se reenvía', async () => {
      conGmail();
      conResendPropio();
      vi.stubEnv('CORREO_PROVEEDOR', 'gmail');

      mocks.sendMail.mockResolvedValue({ messageId: '<x>', rejected: ['persona@ejemplo.com'] });
      expect((await enviarCorreo(datos)).ok).toBe(false);
      mocks.sendMail.mockRejectedValue(errorDeGmail('EMESSAGE', 552));
      expect((await enviarCorreo(datos)).ok).toBe(false);

      expect(mocks.resendSend).not.toHaveBeenCalled();
      expect(filas()).toHaveLength(2);
    });

    it('un error de validación de Resend (después de recibirlo) no pasa a Gmail', async () => {
      conGmail();
      conResendPropio();
      mocks.resendSend.mockResolvedValue({ data: null, error: { name: 'validation_error', statusCode: 422, message: 'Invalid `to` field' } });

      expect((await enviarCorreo(datos)).ok).toBe(false);
      expect(mocks.sendMail).not.toHaveBeenCalled();
    });

    it('correo:probar puede forzar un proveedor, sin segundo intento', async () => {
      conGmail();
      conResendPropio();
      mocks.sendMail.mockRejectedValue(errorDeGmail('EAUTH', 535));

      expect((await enviarCorreo(datos, { proveedor: 'gmail' })).ok).toBe(false);
      expect(mocks.resendSend).not.toHaveBeenCalled();
      expect(filas()).toEqual([expect.objectContaining({ proveedor: 'gmail', resultado: 'error' })]);
    });

    it('un envío con error avisa a Sentry solo con la máscara del destinatario', async () => {
      conGmail();
      mocks.sendMail.mockRejectedValue(errorDeGmail('ECONNECTION'));

      await enviarCorreo(datos);

      expect(mocks.reportarAviso).toHaveBeenCalledTimes(1);
      const [mensaje, extra, etiquetas] = mocks.reportarAviso.mock.calls[0]!;
      expect(mensaje).toBe('Un correo no se pudo enviar');
      expect(extra).toMatchObject({ tipo: 'confirmacion', proveedor: 'gmail', destinatario_mascara: 'p•••••a@ejemplo.com' });
      expect(etiquetas).toMatchObject({ servicio: 'correo', proveedor: 'gmail' });
      expect(JSON.stringify(mocks.reportarAviso.mock.calls).toLowerCase()).not.toContain('persona@ejemplo.com');
    });

    it('un correo aceptado no avisa a Sentry', async () => {
      conGmail();
      await enviarCorreo(datos);
      expect(mocks.reportarAviso).not.toHaveBeenCalled();
    });
  });
});
