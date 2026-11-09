import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
  resendSend: vi.fn(),
}));

vi.mock('nodemailer', () => ({ default: { createTransport: mocks.createTransport } }));
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: mocks.resendSend } })),
}));
vi.mock('@vercel/connect', () => ({ getToken: vi.fn() }));

import { enviarCorreo, obtenerCredencialesGmail } from './correo';

const datos = { para: 'persona@ejemplo.com', asunto: 'Asunto', html: '<p>Hola</p>' };

describe('enviarCorreo', () => {
  beforeEach(() => {
    mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail });
    mocks.sendMail.mockResolvedValue({ messageId: '<id@gmail>', rejected: [] });
    mocks.resendSend.mockResolvedValue({ data: { id: 'resend-id' }, error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('usa Gmail cuando están sus credenciales y quita los espacios de la contraseña', async () => {
    vi.stubEnv('GMAIL_USER', 'app@gmail.com');
    vi.stubEnv('GMAIL_APP_PASSWORD', 'abcd efgh ijkl mnop');

    const resultado = await enviarCorreo(datos);

    expect(resultado).toEqual({ ok: true, id: '<id@gmail>' });
    expect(mocks.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.gmail.com', auth: { user: 'app@gmail.com', pass: 'abcdefghijklmnop' } }),
    );
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: { name: 'Gym Assistant', address: 'app@gmail.com' }, to: 'persona@ejemplo.com' }),
    );
    expect(mocks.resendSend).not.toHaveBeenCalled();
  });

  it('usa Resend cuando falta alguna credencial de Gmail', async () => {
    vi.stubEnv('GMAIL_USER', 'app@gmail.com');
    vi.stubEnv('GMAIL_APP_PASSWORD', '');
    vi.stubEnv('RESEND_API_KEY', 're_prueba');

    const resultado = await enviarCorreo(datos);

    expect(resultado).toEqual({ ok: true, id: 'resend-id' });
    expect(mocks.createTransport).not.toHaveBeenCalled();
  });

  it('devuelve el error si Gmail falla', async () => {
    vi.stubEnv('GMAIL_USER', 'app@gmail.com');
    vi.stubEnv('GMAIL_APP_PASSWORD', 'abcdefghijklmnop');
    mocks.sendMail.mockRejectedValue(new Error('Invalid login'));

    expect(await enviarCorreo(datos)).toEqual({ ok: false, error: 'Invalid login' });
  });

  it('no considera configurado Gmail sin usuario', () => {
    vi.stubEnv('GMAIL_USER', '');
    vi.stubEnv('GMAIL_APP_PASSWORD', 'abcdefghijklmnop');

    expect(obtenerCredencialesGmail()).toBeNull();
  });
});
