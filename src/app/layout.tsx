import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { ProveedorMovimiento } from '@/components/ui/ProveedorMovimiento';
import { SaltarAlContenido } from '@/components/ui/SaltarAlContenido';
import { COLOR_MARCA } from '@/lib/config/marca';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
// Títulos (h1, h2, h3 y la clase font-titulos).
const titulos = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['600', '700'], display: 'swap', variable: '--font-titulos' });

export const metadata: Metadata = {
  // || y no ??: en Vercel la variable puede existir vacía, y una página sin título no cumple WCAG 2.4.2.
  title: process.env.NEXT_PUBLIC_APP_NAME || 'Gym Assistant',
  description: 'Sistema fullstack TypeScript para gestión de gimnasio y asistente de entrenamiento.',
};

export const viewport: Viewport = {
  themeColor: COLOR_MARCA,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${titulos.variable}`}>
      <body className="antialiased bg-transparent text-texto">
        <SaltarAlContenido />
        <ProveedorMovimiento>{children}</ProveedorMovimiento>
      </body>
    </html>
  );
}
