export const ASUNTO_RECUPERACION = 'Restablece tu contraseña de Gym Assistant';
export const ASUNTO_CONFIRMACION = 'Confirma tu cuenta de Gym Assistant';

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

  const filasPasos = c.pasos.map(
    (paso, indice) => `
                    <tr>
                      <td width="36" valign="top" style="padding: 6px 0;">
                        <div style="width: 26px; height: 26px; border-radius: 13px; background-color: #2e7d53; color: #ffffff; font-size: 13px; font-weight: 700; line-height: 26px; text-align: center;">${indice + 1}</div>
                      </td>
                      <td valign="middle" style="padding: 6px 0; color: #1f2933; font-size: 15px; line-height: 1.5;">${paso}</td>
                    </tr>`,
  ).join('');

  const bloquesSecciones = (c.secciones ?? [])
    .map(
      (seccion) => `
                          <p style="margin: 0 0 6px; color: #176d45; font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;">${seccion.titulo}</p>
                          <p style="margin: 0 0 20px; color: #52606d; font-size: 15px; line-height: 1.6;">${seccion.cuerpo}</p>`,
    )
    .join('');

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="color-scheme" content="light">
        <title>${c.asunto}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #eef5f0; color: #1f2933; font-family: 'Segoe UI', Arial, Helvetica, sans-serif;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
          ${c.vistaPrevia}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #eef5f0;">
          <tr>
            <td align="center" style="padding: 32px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px;">
                <tr>
                  <td style="padding: 0 0 16px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" height="36" align="center" style="border-radius: 10px; background-color: #2e7d53; color: #ffffff; font-size: 18px; font-weight: 800;">G</td>
                        <td style="padding-left: 10px; color: #176d45; font-size: 16px; font-weight: 700;">Gym Assistant</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="border-radius: 16px; background-color: #ffffff; border: 1px solid #dce5e0; overflow: hidden;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 36px 32px 28px; background-color: #2e7d53; background-image: linear-gradient(135deg, #2bb673 0%, #176d45 100%); border-radius: 16px 16px 0 0;">
                          <div style="width: 64px; height: 64px; margin: 0 auto 16px; border-radius: 32px; background-color: #ffffff; font-size: 30px; line-height: 64px; text-align: center;">${c.icono}</div>
                          <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 26px; line-height: 1.25;">${c.titulo}</h1>
                          <p style="margin: 0; color: #e4f1ea; font-size: 16px; line-height: 1.5;">${c.subtitulo}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 32px;">
                          <p style="margin: 0 0 24px; color: #52606d; font-size: 16px; line-height: 1.6;">
                            ${c.introduccion}
                          </p>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
                            <tr>
                              <td align="center" style="border-radius: 12px; background-color: #2e7d53;">
                                <a href="${enlaceSeguro}" style="display: block; padding: 16px 24px; color: #ffffff; font-size: 17px; font-weight: 700; text-decoration: none;">
                                  ${c.boton} &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; border-radius: 12px; background-color: #fff7e6; border: 1px solid #f5d9a8;">
                            <tr>
                              <td style="padding: 12px 16px; color: #8a5a00; font-size: 14px; line-height: 1.5;">
                                &#9201; ${c.aviso}
                              </td>
                            </tr>
                          </table>
                          <p style="margin: 0 0 8px; color: #176d45; font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;">${c.tituloPasos ?? 'Así de fácil'}</p>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">${filasPasos}
                          </table>${bloquesSecciones}
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; border-radius: 12px; background-color: #f5f8f6;">
                            <tr>
                              <td style="padding: 14px 16px; color: #52606d; font-size: 14px; line-height: 1.5;">
                                ${c.seguridad}
                              </td>
                            </tr>
                          </table>
                          <p style="margin: 0 0 6px; color: #52606d; font-size: 13px; line-height: 1.5;">
                            ¿El botón no funciona? Copia y pega este enlace en tu navegador:
                          </p>
                          <p style="margin: 0; overflow-wrap: anywhere; word-break: break-all; font-size: 13px; line-height: 1.6;">
                            <a href="${enlaceSeguro}" style="color: #2e7d53;">${enlaceSeguro}</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 20px 16px 0; color: #7b8794; font-size: 12px; line-height: 1.6;">
                    Gym Assistant · Tu progreso, serie a serie.<br>
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
        'Toca el botón verde.',
        'Escribe tu nueva contraseña (mínimo 8 caracteres).',
        'Inicia sesión y sigue con tu entrenamiento.',
      ],
      seguridad:
        '<strong style="color: #1f2933;">¿No fuiste tú?</strong> Ignora este correo. Tu contraseña seguirá igual y tu cuenta está a salvo.',
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
      titulo: '¡Bienvenido a Gym Assistant!',
      subtitulo: 'Solo falta confirmar tu correo.',
      introduccion:
        'Creaste una cuenta con este correo. Confírmalo para empezar a registrar tus ejercicios y recibir tu próxima meta en cada sesión.',
      boton: 'Confirmar mi cuenta',
      aviso: '<strong>El enlace es personal</strong> y solo puede usarse una vez.',
      pasos: [
        'Toca el botón verde para confirmar tu correo.',
        'Entrarás directo a la app con tu sesión iniciada.',
        'Crea tu primer ejercicio: la guía te acompaña paso a paso.',
      ],
      seguridad:
        '<strong style="color: #1f2933;">¿No creaste esta cuenta?</strong> Ignora este correo. La cuenta no se activará sin tu confirmación.',
      pie: 'Recibiste este correo porque alguien se registró en Gym Assistant con esta dirección.',
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
  return `${apodo} quiere crear una cuenta en Gym Assistant: necesitamos tu autorización`;
}

// Correo al tutor de un menor: qué es la app, qué datos se guardan, el uso de Groq, sus derechos y el plazo.
// El botón lleva a una página donde se elige Autorizo o No autorizo (abrir el enlace no decide nada, así los
// antivirus que revisan enlaces no responden por el tutor).
export function plantillaAutorizacionTutor(d: DatosCorreoTutor): { asunto: string; html: string } {
  const apodo = escaparHtml(d.apodo);
  const nombre = escaparHtml(d.nombre);
  const correoMenor = escaparHtml(d.correoMenor);
  const venceEl = escaparHtml(d.venceEl);
  const privacidad = `<a href="${escaparHtml(d.urlPrivacidad)}" style="color: #2e7d53;">política de privacidad</a>`;
  const contacto = d.contacto
    ? `escribiendo a <a href="mailto:${escaparHtml(d.contacto)}" style="color: #2e7d53;">${escaparHtml(d.contacto)}</a>`
    : 'respondiendo a este correo';
  const asunto = asuntoAutorizacionTutor(d.apodo);

  const html = plantillaCorreo(
    {
      asunto: escaparHtml(asunto),
      vistaPrevia: `Revisa la solicitud de ${apodo} y respóndela antes del ${venceEl}.`,
      icono: '&#128106;',
      titulo: 'Necesitamos tu autorización',
      subtitulo: `${apodo} (${d.edad} años) quiere usar Gym Assistant.`,
      introduccion: `<strong style="color: #1f2933;">${nombre}</strong> se registró en Gym Assistant con el correo <strong style="color: #1f2933;">${correoMenor}</strong> y escribió tu dirección como la de su mamá, papá o tutor. Por su edad, la cuenta solo se activa si tú la autorizas. Gym Assistant es una app para registrar entrenamientos y recibir sugerencias de progresión, con un asistente de inteligencia artificial llamado CHRONO.`,
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
            'Nombre, apodo, fecha de nacimiento, género, correo, la foto de perfil si decide subir una, y sus ejercicios y sesiones de entrenamiento. Se usan para personalizar la app; no los vendemos ni los usamos para publicidad.',
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
        '<strong style="color: #1f2933;">¿No conoces esta solicitud?</strong> Toca el botón y elige "No autorizo": la cuenta se eliminará. También puedes ignorar este correo; si nadie responde, la cuenta se borra sola al vencer el plazo.',
      pie: 'Recibiste este correo porque alguien escribió tu dirección como mamá, papá o tutor de una cuenta en Gym Assistant.',
    },
    d.enlace,
  );
  return { asunto, html };
}
