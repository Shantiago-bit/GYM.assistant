// Punto de entrada de Next.js en el servidor: carga Sentry según el runtime y reporta los errores no
// controlados de las rutas, las páginas y el middleware (onRequestError).
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
