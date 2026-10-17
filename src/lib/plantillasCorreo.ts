export function plantillaRecuperacion(enlace: string): string {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 12px; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #059669; font-weight: 700;">
          Gym Assistant
        </p>
        <h1 style="margin: 0 0 16px; font-size: 28px; color: #0f172a;">Restablecer contraseña</h1>
        <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #334155;">
          Hemos recibido una solicitud para cambiar tu contraseña. Haz clic en el botón de abajo para continuar.
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a
            href="${enlace}"
            style="display: inline-block; background: linear-gradient(135deg, #059669, #22c55e); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700;"
          >
            Restablecer contraseña
          </a>
        </div>
        <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.6;">
          Este enlace vence en 30 minutos. Si no solicitaste este cambio, puedes ignorar este mensaje y tu contraseña seguirá sin cambios.
        </p>
      </div>
    </div>
  `;
}
