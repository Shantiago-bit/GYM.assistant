import { getToken } from '@vercel/connect';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const IDENTIFICADOR_CONECTOR = 'gymlead';
const NOMBRE_REMITENTE = 'Gym Assistant';

type DatosCorreo = {
  para: string;
  asunto: string;
  html: string;
};

type ResultadoCorreo = { ok: true; id: string } | { ok: false; error: string };

export async function obtenerClaveResend(): Promise<string> {
  const claveDesdeEnv = process.env.RESEND_API_KEY;

  if (claveDesdeEnv && claveDesdeEnv.trim()) {
    return claveDesdeEnv.trim();
  }

  return getToken(IDENTIFICADOR_CONECTOR, {
    subject: { type: 'app' },
  });
}

// Correo al que se escribe para corregir datos o ejercer derechos sobre ellos.
export function correoDeContacto(): string | null {
  return process.env.CORREO_CONTACTO?.trim() || process.env.GMAIL_USER?.trim() || null;
}

// Gmail permite escribir a cualquier dirección; el remitente de prueba de Resend solo al dueño de la cuenta.
export function obtenerCredencialesGmail(): { usuario: string; clave: string } | null {
  const usuario = process.env.GMAIL_USER?.trim();
  // Google muestra la contraseña de aplicación en grupos de cuatro letras separados por espacios.
  const clave = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');

  if (!usuario || !clave) {
    return null;
  }

  return { usuario, clave };
}

async function enviarConGmail(
  { para, asunto, html }: DatosCorreo,
  { usuario, clave }: { usuario: string; clave: string },
): Promise<ResultadoCorreo> {
  const transporte = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: usuario, pass: clave },
  });

  const respuesta = await transporte.sendMail({
    from: { name: NOMBRE_REMITENTE, address: usuario },
    to: para,
    subject: asunto,
    html,
  });

  if (respuesta.rejected.length > 0) {
    return {
      ok: false,
      error: 'Gmail rechazó el destinatario.',
    };
  }

  return {
    ok: true,
    id: respuesta.messageId,
  };
}

async function enviarConResend({ para, asunto, html }: DatosCorreo): Promise<ResultadoCorreo> {
  const clave = await obtenerClaveResend();

  if (!clave || !clave.trim()) {
    return {
      ok: false,
      error: 'No hay una clave de Resend disponible.',
    };
  }

  const remitente = process.env.RESEND_FROM || 'onboarding@resend.dev';
  const resend = new Resend(clave);
  const respuesta = await resend.emails.send({
    from: remitente,
    to: [para],
    subject: asunto,
    html,
  });

  if (respuesta.error) {
    return {
      ok: false,
      error: respuesta.error.message || 'No se pudo enviar el correo.',
    };
  }

  if (!respuesta.data?.id) {
    return {
      ok: false,
      error: 'La respuesta de Resend no incluyó un identificador válido.',
    };
  }

  return {
    ok: true,
    id: respuesta.data.id,
  };
}

export async function enviarCorreo(datos: DatosCorreo): Promise<ResultadoCorreo> {
  try {
    const gmail = obtenerCredencialesGmail();

    return gmail ? await enviarConGmail(datos, gmail) : await enviarConResend(datos);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'No se pudo enviar el correo.';
    return {
      ok: false,
      error: mensaje,
    };
  }
}
