import type { MetadataRoute } from 'next';
import { COLOR_MARCA, LEMA, NOMBRE_APP } from '@/lib/config/marca';

// Manifest para instalar la app: nombre, colores e íconos de Kairós (PNG en public/marca, generados desde
// Doc/marca/kairos/kairos-icono-app.svg).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: NOMBRE_APP,
    short_name: NOMBRE_APP,
    description: LEMA,
    lang: 'es',
    start_url: '/gym',
    display: 'standalone',
    background_color: COLOR_MARCA,
    theme_color: COLOR_MARCA,
    icons: [
      { src: '/marca/kairos-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/marca/kairos-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
