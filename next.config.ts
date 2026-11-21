import { withSentryConfig } from '@sentry/nextjs/config';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // src/lib/db/conexion.ts lo lee con fs, así que Vercel no lo incluye por sí solo.
  outputFileTracingIncludes: {
    '/**': ['./supabase/ca.crt'],
  },
  // Sentry en el navegador necesita saber el entorno (production o preview) y el commit; las variables del
  // sistema de Vercel solo existen al compilar, así que se copian aquí. No son secretos.
  env: {
    NEXT_PUBLIC_ENTORNO_VERCEL: process.env.VERCEL_ENV ?? '',
    NEXT_PUBLIC_COMMIT_VERCEL: process.env.VERCEL_GIT_COMMIT_SHA ?? '',
  },
};

// Los source maps solo se suben si hay SENTRY_AUTH_TOKEN (en Vercel). Se generan ocultos, se suben a Sentry y se
// borran antes de publicar: el sitio nunca los sirve. Sin el token no se generan ni se suben, y si la subida
// falla la compilación sigue (errorHandler).
const subirSourceMaps = Boolean(process.env.SENTRY_AUTH_TOKEN?.trim());

// La organización, el proyecto y el token los lee el plugin de SENTRY_ORG, SENTRY_PROJECT y SENTRY_AUTH_TOKEN.
export default withSentryConfig(nextConfig, {
  telemetry: false,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { disable: !subirSourceMaps, deleteSourcemapsAfterUpload: true },
  release: {
    create: subirSourceMaps,
    ...(process.env.VERCEL_GIT_COMMIT_SHA ? { name: process.env.VERCEL_GIT_COMMIT_SHA } : {}),
  },
  errorHandler: (error: Error) => {
    console.warn(
      `Sentry: no se pudieron subir los source maps (la compilación sigue): ${error.message}`,
    );
  },
});
