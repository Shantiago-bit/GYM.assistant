import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // src/lib/db/conexion.ts lo lee con fs, así que Vercel no lo incluye por sí solo.
  outputFileTracingIncludes: {
    '/**': ['./supabase/ca.crt'],
  },
};

export default nextConfig;
