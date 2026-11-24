import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // src/lib/db/conexion.ts lo lee con fs, así que Vercel no lo incluye por sí solo.
  outputFileTracingIncludes: {
    '/**': ['./supabase/ca.crt'],
  },
  // "Mi progreso" pasó a ser el Museo: los enlaces viejos (marcadores, guía, CHRONO) siguen funcionando. La
  // consulta (?desde=&hasta=) se conserva.
  async redirects() {
    return [{ source: '/gym/resumen', destination: '/gym/museo', permanent: true }];
  },
};

export default nextConfig;
