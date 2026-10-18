export function plantillaRecuperacion(enlace: string): string {
  const enlaceSeguro = enlace
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  return `
    <!doctype html>
    <html lang="es">
      <body style="margin: 0; padding: 24px; background-color: #f1f5f9; color: #0f172a; font-family: Arial, Helvetica, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #dbe4e8; border-radius: 12px;">
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 12px; color: #087f5b; font-size: 12px; font-weight: 700;">GYM ASSISTANT</p>
              <h1 style="margin: 0 0 16px; font-size: 26px;">Restablecer contraseña</h1>
              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                Recibimos una solicitud para cambiar la contraseña de tu cuenta. Usa el enlace de abajo para elegir una nueva.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 24px;">
                <tr>
                  <td style="border-radius: 8px; background-color: #087f5b;">
                    <a href="${enlaceSeguro}" style="display: inline-block; padding: 14px 24px; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none;">
                      Crear nueva contraseña
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 8px; color: #475569; font-size: 14px; line-height: 1.5;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin: 0 0 24px; overflow-wrap: anywhere; font-size: 13px; line-height: 1.6;">
                <a href="${enlaceSeguro}" style="color: #087f5b;">${enlaceSeguro}</a>
              </p>
              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                El enlace vence en 30 minutos y solo puede usarse una vez. Si no solicitaste este cambio, ignora este correo; tu contraseña no cambiará.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
