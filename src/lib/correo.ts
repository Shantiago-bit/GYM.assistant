import { createHash } from 'node:crypto';
import { getToken } from '@vercel/connect';
import nodemailer, { type Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { insertarRegistroCorreo } from '@/lib/datos/registroCorreos';
import { reportarAviso } from '@/lib/monitoreo/reportar';
import {
  esDominioPropio,
  falloGmailAntesDeAceptar,
  falloResendAntesDeAceptar,
  htmlATexto,
  leerPreferenciaProveedor,
  limpiarError,
  mascaraCorreo,
  normalizarCorreo,
  ordenDeProveedores,
  type MotivoOmision,
  type ProveedorCorreo,
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

type Proveedor = ProveedorCorreo;
// antesDeAceptar: el proveedor no llegó a aceptar el correo (sin conexión, credenciales rechazadas o sin
// configurar). Solo entonces se intenta con el otro proveedor; si no, el correo podría llegar dos veces.
type Intento = {
  resultado: Exclude<ResultadoEnvio, 'omitido'>;
  id?: string;
  error?: string;
  antesDeAceptar?: boolean;
};

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
    process.env.REGISTRO_SECRETO_IP?.trim() ||
    process.env.GYMLEAD_SUPABASE_SERVICE_ROLE_KEY ||
    'gym-assistant';
  return createHash('sha256')
    .update(`${secreto}:correo:${normalizarCorreo(correo)}`)
    .digest('hex');
}

// Un transporte por instancia (y por credenciales), con tiempos de espera para que un SMTP lento no deje
// colgado el registro.
let transporteGmail: { clave: string; transporte: Transporter } | null = null;

export function obtenerTransporteGmail(credenciales: {
  usuario: string;
  clave: string;
}): Transporter {
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

async function enviarConGmail(datos: DatosCorreo): Promise<Intento> {
  const credenciales = obtenerCredencialesGmail();
  if (!credenciales) {
    return {
      resultado: 'error',
      error: 'Faltan GMAIL_USER o GMAIL_APP_PASSWORD.',
      antesDeAceptar: true,
    };
  }
  const contacto = correoDeContacto();
  let respuesta: { rejected: unknown[]; messageId: string };
  try {
    respuesta = await obtenerTransporteGmail(credenciales).sendMail({
      from: { name: NOMBRE_REMITENTE, address: credenciales.usuario },
      to: datos.para,
      ...(contacto ? { replyTo: contacto } : {}),
      subject: datos.asunto,
      html: datos.html,
      // La versión de texto plano ayuda a que el correo no se marque como spam.
      text: htmlATexto(datos.html),
    });
  } catch (error) {
    return {
      resultado: 'error',
      error: error instanceof Error ? error.message : 'No se pudo enviar el correo.',
      antesDeAceptar: falloGmailAntesDeAceptar(error),
    };
  }

  if (respuesta.rejected.length > 0) {
    return { resultado: 'rechazado', error: 'Gmail rechazó el destinatario.' };
  }
  return { resultado: 'aceptado', id: respuesta.messageId };
}

async function enviarConResend(datos: DatosCorreo): Promise<Intento> {
  let clave: string;
  try {
    clave = await obtenerClaveResend();
  } catch (error) {
    return {
      resultado: 'error',
      error: error instanceof Error ? error.message : 'Sin clave de Resend.',
      antesDeAceptar: true,
    };
  }

  if (!clave || !clave.trim()) {
    return {
      resultado: 'error',
      error: 'No hay una clave de Resend disponible.',
      antesDeAceptar: true,
    };
  }

  const contacto = correoDeContacto();
  const resend = new Resend(clave);
  let respuesta: Awaited<ReturnType<Resend['emails']['send']>>;
  try {
    respuesta = await resend.emails.send({
      // Con dominio propio: "Gym Assistant <no-responder@midominio.com>". Sin él, el remitente de prueba.
      from: process.env.RESEND_FROM?.trim() || 'onboarding@resend.dev',
      to: [datos.para],
      ...(contacto ? { replyTo: contacto } : {}),
      subject: datos.asunto,
      html: datos.html,
      text: htmlATexto(datos.html),
    });
  } catch (error) {
    // Sin respuesta de Resend: el correo no se aceptó.
    return {
      resultado: 'error',
      error: error instanceof Error ? error.message : 'No se pudo enviar el correo.',
      antesDeAceptar: true,
    };
  }

  if (respuesta.error) {
    return {
      resultado: 'error',
      error: respuesta.error.message || 'No se pudo enviar el correo.',
      antesDeAceptar: falloResendAntesDeAceptar(respuesta.error),
    };
  }
  if (!respuesta.data?.id) {
    return {
      resultado: 'error',
      error: 'La respuesta de Resend no incluyó un identificador válido.',
    };
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
  // Aviso a Sentry (si está activo) con la máscara del destinatario, nunca el correo completo.
  if (asiento.resultado === 'error') {
    reportarAviso(
      'Un correo no se pudo enviar',
      {
        tipo: asiento.tipo,
        proveedor: asiento.proveedor ?? null,
        destinatario_mascara: mascara,
        detalle: error ?? null,
      },
      { servicio: 'correo', ...(asiento.proveedor ? { proveedor: asiento.proveedor } : {}) },
    );
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
      fallo instanceof Error
        ? limpiarError(fallo.message, secretosConocidos())
        : 'error desconocido',
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

// Proveedores en el orden en que se intentan, según CORREO_PROVEEDOR ('gmail', 'resend' o 'auto') y lo que esté
// configurado. En 'auto' se usa Resend si RESEND_FROM tiene un dominio propio y hay RESEND_API_KEY; si no, Gmail.
export function proveedoresDeEnvio(): Proveedor[] {
  return ordenDeProveedores({
    preferencia: leerPreferenciaProveedor(process.env.CORREO_PROVEEDOR),
    gmailConfigurado: obtenerCredencialesGmail() !== null,
    resendConDominioPropio:
      esDominioPropio(process.env.RESEND_FROM) && Boolean(process.env.RESEND_API_KEY?.trim()),
  });
}

// Envía con el primer proveedor; si falla antes de aceptar el correo, una sola vez con el otro (si está
// configurado). Cada intento queda en registro_correos. `opciones.proveedor` fuerza uno solo, sin respaldo
// (lo usa npm run correo:probar -- --proveedor).
export async function enviarCorreo(
  datos: DatosCorreo,
  opciones: { proveedor?: Proveedor } = {},
): Promise<ResultadoCorreo> {
  const orden = opciones.proveedor ? [opciones.proveedor] : proveedoresDeEnvio();
  let intento: Intento = { resultado: 'error', error: 'No hay proveedor de correo.' };

  for (const proveedor of orden) {
    const inicio = Date.now();
    try {
      intento = proveedor === 'gmail' ? await enviarConGmail(datos) : await enviarConResend(datos);
    } catch (error) {
      intento = {
        resultado: 'error',
        error: error instanceof Error ? error.message : 'No se pudo enviar el correo.',
      };
    }

    await asentar({
      tipo: datos.tipo,
      para: datos.para,
      usuarioId: datos.usuarioId,
      resultado: intento.resultado,
      proveedor,
      idMensaje: intento.id,
      error: intento.error,
      duracionMs: Date.now() - inicio,
    });

    if (intento.resultado === 'aceptado' || !intento.antesDeAceptar) break;
  }

  return intento.resultado === 'aceptado' && intento.id
    ? { ok: true, id: intento.id }
    : {
        ok: false,
        error: limpiarError(intento.error ?? 'No se pudo enviar el correo.', secretosConocidos()),
      };
}
