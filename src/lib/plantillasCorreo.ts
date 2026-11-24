// Colores de los correos: los clientes de correo no leen variables CSS, así que estos valores se escriben a mano.
// Los clientes no son fiables con fondos oscuros: el encabezado y el pie van sobre el fondo de la app (#0d0918, con el
// logo en su baldosa), pero el cuerpo es claro (#ffffff con texto #221b33) y los botones usan --color-primario
// (#6a4bbd, texto blanco 6,3:1). tests/visual/colores.test.ts comprueba que el fondo y el morado coincidan con
// src/app/globals.css y que no quede el verde anterior. Si cambias la paleta, actualízalos aquí también.
import { LEMA, LOGOTIPO, NOMBRE_APP } from '@/lib/config/marca';
import { obtenerUrlBase } from '@/lib/urlBase';

export const ASUNTO_RECUPERACION = `Restablece tu contraseña de ${NOMBRE_APP}`;
export const ASUNTO_CONFIRMACION = `Confirma tu cuenta de ${NOMBRE_APP}`;
export const RUTA_LOGO_CORREO = '/marca/kairos-correo.png';

export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Partes que cambian entre correos. Los textos son constantes de este archivo (pueden llevar HTML); lo que
// llega de afuera (el enlace, y en el correo al tutor el nombre, el apodo y los correos) se escapa.
interface ContenidoCorreo {
  asunto: string;
  vistaPrevia: string;
  icono: string; // entidad HTML del emoji
  titulo: string;
  subtitulo: string;
  introduccion: string;
  boton: string;
  aviso: string;
  pasos: string[];
  tituloPasos?: string;
  secciones?: { titulo: string; cuerpo: string }[];
  seguridad: string;
  pie: string;
}

function plantillaCorreo(c: ContenidoCorreo, enlace: string): string {
  const enlaceSeguro = escaparHtml(enlace);
  // El logo es un PNG alojado en el sitio (los clientes de correo no muestran SVG).
  const urlLogo = escaparHtml(`${obtenerUrlBase()}${RUTA_LOGO_CORREO}`);

  const filasPasos = c.pasos.map(
    (paso, indice) => `
                    <tr>
                      <td width="36" valign="top" style="padding: 6px 0;">
                        <div style="width: 26px; height: 26px; border-radius: 13px; background-color: #6a4bbd; color: #ffffff; font-size: 13px; font-weight: 700; line-height: 26px; text-align: center;">${indice + 1}</div>
                      </td>
                      <td valign="middle" style="padding: 6px 0; color: #221b33; font-size: 15px; line-height: 1.5;">${paso}</td>
                    </tr>`,
  ).join('');

  const bloquesSecciones = (c.secciones ?? [])
    .map(
      (seccion) => `
                          <p style="margin: 0 0 6px; color: #563a9e; font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;">${seccion.titulo}</p>
                          <p style="margin: 0 0 20px; color: #5d5670; font-size: 15px; line-height: 1.6;">${seccion.cuerpo}</p>`,
    )
    .join('');

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <title>${c.asunto}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0d0918; color: #221b33; font-family: 'Segoe UI', Arial, Helvetica, sans-serif;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
          ${c.vistaPrevia}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#0d0918" style="background-color: #0d0918;">
          <tr>
            <td align="center" style="padding: 32px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px;">
                <tr>
                  <td style="padding: 0 0 16px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="40" height="40" valign="middle"><img src="${urlLogo}" width="40" height="40" alt="${NOMBRE_APP}" style="display: block; width: 40px; height: 40px; border: 0; border-radius: 10px;"></td>
                        <td style="padding-left: 12px; color: #efe8ff; font-family: Georgia, 'Times New Roman', serif; font-size: 18px; font-weight: 700; letter-spacing: 0.14em;">${LOGOTIPO}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#ffffff" style="border-radius: 16px; background-color: #ffffff; border: 1px solid #3a2a66; overflow: hidden;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" bgcolor="#0d0918" style="padding: 36px 32px 28px; background-color: #0d0918; background-image: radial-gradient(circle at 30% 0%, #24164a 0%, #0d0918 70%); border-radius: 16px 16px 0 0;">
                          <div style="width: 64px; height: 64px; margin: 0 auto 16px; border-radius: 32px; background-color: #241a38; border: 1px solid #5b3fb3; font-size: 30px; line-height: 64px; text-align: center;">${c.icono}</div>
                          <h1 style="margin: 0 0 8px; color: #f3effc; font-size: 26px; line-height: 1.25;">${c.titulo}</h1>
                          <p style="margin: 0; color: #c4b1ff; font-size: 16px; line-height: 1.5;">${c.subtitulo}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 32px;">
                          <p style="margin: 0 0 24px; color: #5d5670; font-size: 16px; line-height: 1.6;">
                            ${c.introduccion}
                          </p>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
                            <tr>
                              <td align="center" bgcolor="#6a4bbd" style="border-radius: 12px; background-color: #6a4bbd;">
                                <a href="${enlaceSeguro}" style="display: block; padding: 16px 24px; color: #ffffff; font-size: 17px; font-weight: 700; text-decoration: none;">
                                  ${c.boton} &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; border-radius: 12px; background-color: #fdf3e1; border: 1px solid #f5d9a8;">
                            <tr>
                              <td style="padding: 12px 16px; color: #8a4f06; font-size: 14px; line-height: 1.5;">
                                &#9201; ${c.aviso}
                              </td>
                            </tr>
                          </table>
                          <p style="margin: 0 0 8px; color: #563a9e; font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;">${c.tituloPasos ?? 'Así de fácil'}</p>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">${filasPasos}
                          </table>${bloquesSecciones}
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; border-radius: 12px; background-color: #f8f6fd;">
                            <tr>
                              <td style="padding: 14px 16px; color: #5d5670; font-size: 14px; line-height: 1.5;">
                                ${c.seguridad}
                              </td>
                            </tr>
                          </table>
                          <p style="margin: 0 0 6px; color: #5d5670; font-size: 13px; line-height: 1.5;">
                            ¿El botón no funciona? Copia y pega este enlace en tu navegador:
                          </p>
                          <p style="margin: 0; overflow-wrap: anywhere; word-break: break-all; font-size: 13px; line-height: 1.6;">
                            <a href="${enlaceSeguro}" style="color: #6a4bbd;">${enlaceSeguro}</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 20px 16px 0; color: #b4aacb; font-size: 12px; line-height: 1.6;">
                    ${NOMBRE_APP} · ${LEMA}.<br>
                    ${c.pie}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function plantillaRecuperacion(enlace: string): string {
  return plantillaCorreo(
    {
      asunto: ASUNTO_RECUPERACION,
      vistaPrevia: 'Crea una nueva contraseña en menos de un minuto. El enlace vence en 30 minutos.',
      icono: '&#128273;',
      titulo: '¿Olvidaste tu contraseña?',
      subtitulo: 'No pasa nada, la cambiamos en un momento.',
      introduccion:
        'Recibimos una solicitud para restablecer la contraseña de tu cuenta. Toca el botón y elige una nueva.',
      boton: 'Crear nueva contraseña',
      aviso: '<strong>El enlace vence en 30 minutos</strong> y solo puede usarse una vez.',
      pasos: [
        'Toca el botón morado.',
        'Escribe tu nueva contraseña (mínimo 8 caracteres).',
        'Inicia sesión y sigue con tu entrenamiento.',
      ],
      seguridad:
        '<strong style="color: #221b33;">¿No fuiste tú?</strong> Ignora este correo. Tu contraseña seguirá igual y tu cuenta está a salvo.',
      pie: 'Recibiste este correo porque alguien pidió restablecer la contraseña de esta cuenta.',
    },
    enlace,
  );
}

export function plantillaConfirmacion(enlace: string): string {
  return plantillaCorreo(
    {
      asunto: ASUNTO_CONFIRMACION,
      vistaPrevia: 'Confirma tu correo y empieza a registrar tus entrenamientos.',
      icono: '&#128170;',
      titulo: `¡Bienvenido a ${NOMBRE_APP}!`,
      subtitulo: 'Solo falta confirmar tu correo.',
      introduccion:
        'Creaste una cuenta con este correo. Confírmalo para empezar a registrar tus ejercicios y recibir tu próxima meta en cada sesión.',
      boton: 'Confirmar mi cuenta',
      aviso: '<strong>El enlace es personal</strong> y solo puede usarse una vez.',
      pasos: [
        'Toca el botón morado para confirmar tu correo.',
        'Entrarás directo a la app con tu sesión iniciada.',
        'Crea tu primer ejercicio: la guía te acompaña paso a paso.',
      ],
      seguridad:
        '<strong style="color: #221b33;">¿No creaste esta cuenta?</strong> Ignora este correo. La cuenta no se activará sin tu confirmación.',
      pie: `Recibiste este correo porque alguien se registró en ${NOMBRE_APP} con esta dirección.`,
    },
    enlace,
  );
}

export interface DatosCorreoTutor {
  nombre: string;
  apodo: string;
  edad: number;
  correoMenor: string;
  enlace: string;
  venceEl: string; // "18 de noviembre de 2026"
  dias: number;
  urlPrivacidad: string;
  contacto: string | null;
}

export function asuntoAutorizacionTutor(apodo: string): string {
  return `${apodo} quiere crear una cuenta en ${NOMBRE_APP}: necesitamos tu autorización`;
}

// Correo al tutor de un menor: qué es la app, qué datos se guardan, el uso de Groq, sus derechos y el plazo.
// El botón lleva a una página donde se elige Autorizo o No autorizo (abrir el enlace no decide nada, así los
// antivirus que revisan enlaces no responden por el tutor).
export function plantillaAutorizacionTutor(d: DatosCorreoTutor): { asunto: string; html: string } {
  const apodo = escaparHtml(d.apodo);
  const nombre = escaparHtml(d.nombre);
  const correoMenor = escaparHtml(d.correoMenor);
  const venceEl = escaparHtml(d.venceEl);
  const privacidad = `<a href="${escaparHtml(d.urlPrivacidad)}" style="color: #6a4bbd;">política de privacidad</a>`;
  const contacto = d.contacto
    ? `escribiendo a <a href="mailto:${escaparHtml(d.contacto)}" style="color: #6a4bbd;">${escaparHtml(d.contacto)}</a>`
    : 'respondiendo a este correo';
  const asunto = asuntoAutorizacionTutor(d.apodo);

  const html = plantillaCorreo(
    {
      asunto: escaparHtml(asunto),
      vistaPrevia: `Revisa la solicitud de ${apodo} y respóndela antes del ${venceEl}.`,
      icono: '&#128106;',
      titulo: 'Necesitamos tu autorización',
      subtitulo: `${apodo} (${d.edad} años) quiere usar ${NOMBRE_APP}.`,
      introduccion: `<strong style="color: #221b33;">${nombre}</strong> se registró en ${NOMBRE_APP} con el correo <strong style="color: #221b33;">${correoMenor}</strong> y escribió tu dirección como la de su mamá, papá o tutor. Por su edad, la cuenta solo se activa si tú la autorizas. ${NOMBRE_APP} es una app para registrar entrenamientos y recibir sugerencias de progresión, con un asistente de inteligencia artificial llamado CHRONO.`,
      boton: 'Revisar y responder',
      aviso: `<strong>El enlace vence el ${venceEl}</strong> (${d.dias} días) y solo puede usarse una vez. Si no respondes, la cuenta se eliminará con todos sus datos.`,
      tituloPasos: 'Qué pasa después',
      pasos: [
        'Toca el botón y revisa la solicitud.',
        'Elige <strong>Autorizo</strong> o <strong>No autorizo</strong>.',
        `Si autorizas, ${apodo} recibirá un correo para confirmar su cuenta y entrar. Si no, la cuenta y sus datos se borran de inmediato.`,
      ],
      secciones: [
        {
          titulo: 'Qué datos guardamos',
          cuerpo:
            'Nombre, apodo, fecha de nacimiento, género, correo, la foto de perfil si decide subir una, sus preferencias de entrenamiento (qué días entrena) y sus ejercicios y sesiones. Se usan para personalizar la app; no los vendemos ni los usamos para publicidad.',
        },
        {
          titulo: 'CHRONO y Groq',
          cuerpo:
            'Los mensajes que escriba en el chat, y los datos de entrenamiento que CHRONO consulte para responder, se envían a Groq, el servicio que genera las respuestas. De su perfil, CHRONO solo recibe su apodo, su edad y si es su cumpleaños. Con menores, CHRONO es especialmente prudente: técnica, hábitos saludables y supervisión de un adulto.',
        },
        {
          titulo: 'Tus derechos',
          cuerpo: `Según la Ley 1581 de 2012 de Colombia, puedes conocer, actualizar y corregir sus datos, pedir que los eliminemos y retirar esta autorización cuando quieras, ${contacto}. Más detalles en la ${privacidad}.`,
        },
      ],
      seguridad:
        '<strong style="color: #221b33;">¿No conoces esta solicitud?</strong> Toca el botón y elige "No autorizo": la cuenta se eliminará. También puedes ignorar este correo; si nadie responde, la cuenta se borra sola al vencer el plazo.',
      pie: `Recibiste este correo porque alguien escribió tu dirección como mamá, papá o tutor de una cuenta en ${NOMBRE_APP}.`,
    },
    d.enlace,
  );
  return { asunto, html };
}
