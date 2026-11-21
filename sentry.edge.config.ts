// Sentry en el edge (middleware). Solo se inicia con SENTRY_DSN en producción o en vistas previas de Vercel.
import * as Sentry from '@sentry/nextjs';
import { opcionesSentry } from '@/lib/monitoreo/opciones';

const opciones = opcionesSentry({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  vercelEnv: process.env.VERCEL_ENV,
  nodeEnv: process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  muestreo: process.env.SENTRY_TRACES_SAMPLE_RATE,
});

if (opciones) {
  Sentry.init(opciones);
}
