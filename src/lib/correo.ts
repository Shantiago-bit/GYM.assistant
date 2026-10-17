import { getToken } from '@vercel/connect';
import { Resend } from 'resend';

const IDENTIFICADOR_CONECTOR = 'gymlead';

export async function obtenerClaveResend(): Promise<string> {
  const claveDesdeEnv = process.env.RESEND_API_KEY;

  if (claveDesdeEnv && claveDesdeEnv.trim()) {
    return claveDesdeEnv.trim();
  }

  return getToken(IDENTIFICADOR_CONECTOR, {
    subject: { type: 'app' },
  });
}

export async function enviarCorreo({
  para,
  asunto,
  html,
}: {
  para: string;
  asunto: string;
  html: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
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
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'No se pudo enviar el correo.';
    return {
      ok: false,
      error: mensaje,
    };
  }
}
