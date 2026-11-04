export const ASUNTO_RECUPERACION = 'Restablece tu contraseña de Gym Assistant';

const PASOS = [
  'Toca el botón verde.',
  'Escribe tu nueva contraseña (mínimo 8 caracteres).',
  'Inicia sesión y sigue con tu entrenamiento.',
];

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function plantillaRecuperacion(enlace: string): string {
  const enlaceSeguro = escaparHtml(enlace);

  const filasPasos = PASOS.map(
    (paso, indice) => `
                    <tr>
                      <td width="36" valign="top" style="padding: 6px 0;">
                        <div style="width: 26px; height: 26px; border-radius: 13px; background-color: #2e7d53; color: #ffffff; font-size: 13px; font-weight: 700; line-height: 26px; text-align: center;">${indice + 1}</div>
                      </td>
                      <td valign="middle" style="padding: 6px 0; color: #1f2933; font-size: 15px; line-height: 1.5;">${paso}</td>
                    </tr>`,
  ).join('');

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="color-scheme" content="light">
        <title>${ASUNTO_RECUPERACION}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #eef5f0; color: #1f2933; font-family: 'Segoe UI', Arial, Helvetica, sans-serif;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
          Crea una nueva contraseña en menos de un minuto. El enlace vence en 30 minutos.
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
                          <div style="width: 64px; height: 64px; margin: 0 auto 16px; border-radius: 32px; background-color: #ffffff; font-size: 30px; line-height: 64px; text-align: center;">&#128273;</div>
                          <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 26px; line-height: 1.25;">¿Olvidaste tu contraseña?</h1>
                          <p style="margin: 0; color: #e4f1ea; font-size: 16px; line-height: 1.5;">No pasa nada, la cambiamos en un momento.</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 32px;">
                          <p style="margin: 0 0 24px; color: #52606d; font-size: 16px; line-height: 1.6;">
                            Recibimos una solicitud para restablecer la contraseña de tu cuenta. Toca el botón y elige una nueva.
                          </p>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
                            <tr>
                              <td align="center" style="border-radius: 12px; background-color: #2e7d53;">
                                <a href="${enlaceSeguro}" style="display: block; padding: 16px 24px; color: #ffffff; font-size: 17px; font-weight: 700; text-decoration: none;">
                                  Crear nueva contraseña &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; border-radius: 12px; background-color: #fff7e6; border: 1px solid #f5d9a8;">
                            <tr>
                              <td style="padding: 12px 16px; color: #8a5a00; font-size: 14px; line-height: 1.5;">
                                &#9201; <strong>El enlace vence en 30 minutos</strong> y solo puede usarse una vez.
                              </td>
                            </tr>
                          </table>
                          <p style="margin: 0 0 8px; color: #176d45; font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;">Así de fácil</p>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">${filasPasos}
                          </table>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; border-radius: 12px; background-color: #f5f8f6;">
                            <tr>
                              <td style="padding: 14px 16px; color: #52606d; font-size: 14px; line-height: 1.5;">
                                <strong style="color: #1f2933;">¿No fuiste tú?</strong> Ignora este correo. Tu contraseña seguirá igual y tu cuenta está a salvo.
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
                    Recibiste este correo porque alguien pidió restablecer la contraseña de esta cuenta.
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
