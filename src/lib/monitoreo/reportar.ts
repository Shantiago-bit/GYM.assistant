// Avisos a Sentry desde el código del servidor. Si Sentry no se inició (sin SENTRY_DSN, en desarrollo o en las
// pruebas), estas funciones no hacen nada: el SDK descarta los eventos sin cliente.
import * as Sentry from '@sentry/nextjs';

// Errores inesperados (los que terminan en 500).
export function reportarError(error: unknown, etiquetas?: Record<string, string>): void {
  Sentry.captureException(error, etiquetas ? { tags: etiquetas } : undefined);
}

// Situaciones que no rompen la página pero conviene saber (un correo que no salió, Groq que no responde).
// Los datos deben ser técnicos: tipo, proveedor, máscara del correo; nunca el correo completo ni textos de la persona.
export function reportarAviso(
  mensaje: string,
  datos: Record<string, string | number | null | undefined>,
  etiquetas?: Record<string, string>,
): void {
  Sentry.captureMessage(mensaje, {
    level: 'warning',
    extra: datos,
    ...(etiquetas ? { tags: etiquetas } : {}),
  });
}

// La persona se identifica solo por su id interno (UUID).
export function fijarUsuarioDelInforme(usuarioId: string): void {
  Sentry.setUser({ id: usuarioId });
}
