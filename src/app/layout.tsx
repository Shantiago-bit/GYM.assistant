import type { Metadata, Viewport } from 'next';
import { Cinzel, Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { ProveedorMovimiento } from '@/components/ui/ProveedorMovimiento';
import { SaltarAlContenido } from '@/components/ui/SaltarAlContenido';
import { COLOR_MARCA, LEMA, NOMBRE_APP } from '@/lib/config/marca';
import { SCRIPT_NIVEL } from '@/lib/reglas/animacion';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
// Títulos (h1, h2, h3 y la clase font-titulos).
const titulos = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['600', '700'], display: 'swap', variable: '--font-titulos' });
// Solo el logotipo «KAIRÓS» (clase font-marca).
const marca = Cinzel({ subsets: ['latin'], weight: ['700'], display: 'swap', variable: '--font-marca' });

export const metadata: Metadata = {
  // El nombre sale de src/lib/config/marca.ts (ya no de NEXT_PUBLIC_APP_NAME, que en Vercel aún dice el nombre
  // anterior). Cada página pone solo su título: la plantilla agrega « · Kairós».
  title: { default: NOMBRE_APP, template: `%s · ${NOMBRE_APP}` },
  description: `${NOMBRE_APP}: ${LEMA}. Registra tu prueba inicial, sigue cada sesión y recibe tu próxima meta.`,
  applicationName: NOMBRE_APP,
  appleWebApp: { title: NOMBRE_APP },
  openGraph: { siteName: NOMBRE_APP, title: NOMBRE_APP, description: LEMA, locale: 'es_CO', type: 'website' },
};

export const viewport: Viewport = {
  themeColor: COLOR_MARCA,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${titulos.variable} ${marca.variable}`} suppressHydrationWarning>
      <head>
        {/* Nivel de animación (cookie y preferencia del sistema) en <html> antes de pintar: sin parpadeo. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_NIVEL }} />
      </head>
      <body className="antialiased bg-transparent text-texto">
        <SaltarAlContenido />
        <ProveedorMovimiento>{children}</ProveedorMovimiento>
      </body>
    </html>
  );
}
