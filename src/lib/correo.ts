import { createHash } from 'node:crypto';
import { getToken } from '@vercel/connect';
import nodemailer, { type Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { insertarRegistroCorreo } from '@/lib/datos/registroCorreos';
import {
  htmlATexto,
  limpiarError,
  mascaraCorreo,
  normalizarCorreo,
  type MotivoOmision,
  type ResultadoEnvio,
  type TipoCorreo,
} from '@/lib/reglas/correo';

const IDENTIFICADOR_CONECTOR = 'gymlead';
const NOMBRE_REMITENTE = 'Gym Assistant';

export interface DatosCorreo {
  para: string;
  asunto: string;
  html: string;
  // Para el registro de envíos: qué correo es y de qué cuenta (si se sabe).
  tipo: TipoCorreo;
  usuarioId?: string | null | undefined;
}

export type ResultadoCorreo = { ok: true; id: string } | { ok: false; error: string };

type Proveedor = 'gmail' | 'resend';
type Intento = { resultado: Exclude<ResultadoEnvio, 'omitido'>; id?: string; error?: string };

export async function obtenerClaveResend(): Promise<string> {
  const claveDesdeEnv = process.env.RESEND_API_KEY;

  if (claveDesdeEnv && claveDesdeEnv.trim()) {
    return claveDesdeEnv.trim();
  }

  return getToken(IDENTIFICADOR_CONECTOR, {
    subject: { type: 'app' },
  });
}

// Correo al que se escribe para corregir datos o ejercer derechos sobre ellos (y a donde van las respuestas).
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

// Hash del destinatario para el registro: SHA-256 del correo normalizado con el mismo secreto que el conteo
// de intentos del registro (REGISTRO_SECRETO_IP; si falta, la clave de servicio). Para que
// `npm run correo:historial` encuentre los registros de producción, .env.local debe tener el mismo valor.
export function hashDestinatario(correo: string): string {
  const secreto =
    process.env.REGISTRO_SECRETO_IP?.trim() || process.env.GYMLEAD_SUPABASE_SERVICE_ROLE_KEY || 'gym-assistant';
  return createHash('sha256').update(`${secreto}:correo:${normalizarCorreo(correo)}`).digest('hex');
}

// Un transporte por instancia (y por credenciales), con tiempos de espera para que un SMTP lento no deje
// colgado el registro.
let transporteGmail: { clave: string; transporte: Transporter } | null = null;

export function obtenerTransporteGmail(credenciales: { usuario: string; clave: string }): Transporter {
  const identidad = `${credenciales.usuario}:${createHash('sha256').update(credenciales.clave).digest('hex')}`;
  if (transporteGmail?.clave !== identidad) {
    transporteGmail = {
      clave: identidad,
      transporte: nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: credenciales.usuario, pass: credenciales.clave },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      }),
    };
  }
  return transporteGmail.transporte;
}

async function enviarConGmail(datos: DatosCorreo, credenciales: { usuario: string; clave: string }): Promise<Intento> {
  const contacto = correoDeContacto();
  const respuesta = await obtenerTransporteGmail(credenciales).sendMail({
    from: { name: NOMBRE_REMITENTE, address: credenciales.usuario },
    to: datos.para,
    ...(contacto ? { replyTo: contacto } : {}),
    subject: datos.asunto,
    html: datos.html,
    // La versión de texto plano ayuda a que el correo no se marque como spam.
    text: htmlATexto(datos.html),
  });

  if (respuesta.rejected.length > 0) {
    return { resultado: 'rechazado', error: 'Gmail rechazó el destinatario.' };
  }
  return { resultado: 'aceptado', id: respuesta.messageId };
}

async function enviarConResend(datos: DatosCorreo): Promise<Intento> {
  const clave = await obtenerClaveResend();

  if (!clave || !clave.trim()) {
    return { resultado: 'error', error: 'No hay una clave de Resend disponible.' };
  }

  const contacto = correoDeContacto();
  const resend = new Resend(clave);
  const respuesta = await resend.emails.send({
    from: process.env.RESEND_FROM || 'onboarding@resend.dev',
    to: [datos.para],
    ...(contacto ? { replyTo: contacto } : {}),
    subject: datos.asunto,
    html: datos.html,
    text: htmlATexto(datos.html),
  });

  if (respuesta.error) {
    return { resultado: 'error', error: respuesta.error.message || 'No se pudo enviar el correo.' };
  }
  if (!respuesta.data?.id) {
    return { resultado: 'error', error: 'La respuesta de Resend no incluyó un identificador válido.' };
  }
  return { resultado: 'aceptado', id: respuesta.data.id };
}

const secretosConocidos = () => [
  process.env.GMAIL_APP_PASSWORD,
  process.env.RESEND_API_KEY,
  process.env.GYMLEAD_SUPABASE_SERVICE_ROLE_KEY,
];

interface Asiento {
  tipo: TipoCorreo;
  para: string;
  usuarioId?: string | null | undefined;
  resultado: ResultadoEnvio;
  motivo?: MotivoOmision | undefined;
  proveedor?: Proveedor | undefined;
  idMensaje?: string | undefined;
  error?: string | undefined;
  duracionMs?: number | undefined;
}

// Deja constancia del intento en la tabla y en los logs de Vercel (una línea JSON, con el correo enmascarado).
// Si la tabla falla, el envío no se ve afectado.
async function asentar(asiento: Asiento): Promise<void> {
  const mascara = mascaraCorreo(asiento.para);
  const error = asiento.error ? limpiarError(asiento.error, secretosConocidos()) : undefined;
  const linea = JSON.stringify({
    evento: 'correo',
    tipo: asiento.tipo,
    resultado: asiento.resultado,
    ...(asiento.motivo ? { motivo: asiento.motivo } : {}),
    ...(asiento.proveedor ? { proveedor: asiento.proveedor } : {}),
    ...(asiento.duracionMs !== undefined ? { duracion_ms: asiento.duracionMs } : {}),
    destinatario: mascara,
    ...(error ? { error } : {}),
  });
  if (asiento.resultado === 'aceptado' || asiento.resultado === 'omitido') {
    console.info(linea);
  } else {
    console.error(linea);
  }

  try {
    await insertarRegistroCorreo({
      tipo: asiento.tipo,
      destinatarioHash: hashDestinatario(asiento.para),
      destinatarioMascara: mascara,
      usuarioId: asiento.usuarioId ?? null,
      resultado: asiento.resultado,
      motivoOmision: asiento.motivo ?? null,
      proveedor: asiento.proveedor ?? null,
      idMensaje: asiento.idMensaje ?? null,
      error: error ?? null,
      duracionMs: asiento.duracionMs ?? null,
    });
  } catch (fallo) {
    console.error(
      'No se pudo guardar el registro del correo:',
      fallo instanceof Error ? limpiarError(fallo.message, secretosConocidos()) : 'error desconocido',
    );
  }
}

// Una regla decidió no enviar: queda registrado, pero la respuesta a la persona no cambia.
export async function registrarOmision(datos: {
  tipo: TipoCorreo;
  para: string;
  usuarioId?: string | null | undefined;
  motivo: MotivoOmision;
}): Promise<void> {
  await asentar({ ...datos, resultado: 'omitido' });
}

export async function enviarCorreo(datos: DatosCorreo): Promise<ResultadoCorreo> {
  const gmail = obtenerCredencialesGmail();
  const proveedor: Proveedor = gmail ? 'gmail' : 'resend';
  const inicio = Date.now();
  let intento: Intento;
  try {
    intento = gmail ? await enviarConGmail(datos, gmail) : await enviarConResend(datos);
  } catch (error) {
    intento = { resultado: 'error', error: error instanceof Error ? error.message : 'No se pudo enviar el correo.' };
  }
  const duracionMs = Date.now() - inicio;

  await asentar({
    tipo: datos.tipo,
    para: datos.para,
    usuarioId: datos.usuarioId,
    resultado: intento.resultado,
    proveedor,
    idMensaje: intento.id,
    error: intento.error,
    duracionMs,
  });

  return intento.resultado === 'aceptado' && intento.id
    ? { ok: true, id: intento.id }
    : { ok: false, error: limpiarError(intento.error ?? 'No se pudo enviar el correo.', secretosConocidos()) };
}
