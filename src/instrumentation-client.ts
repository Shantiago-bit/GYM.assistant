// Sentry en el navegador. Solo se inicia con NEXT_PUBLIC_SENTRY_DSN en producción o en vistas previas.
// El entorno y el commit llegan desde next.config.ts (las variables de Vercel no existen en el navegador).
// Sin Session Replay: no se graba la pantalla ni lo que se escribe en los formularios.
import * as Sentry from '@sentry/nextjs';
import { opcionesSentry } from '@/lib/monitoreo/opciones';

const opciones = opcionesSentry({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  vercelEnv: process.env.NEXT_PUBLIC_ENTORNO_VERCEL,
  nodeEnv: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_COMMIT_VERCEL,
  muestreo: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
});

if (opciones) {
  Sentry.init(opciones);
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
