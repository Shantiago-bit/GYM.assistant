import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ProveedorMovimiento } from '@/components/ui/ProveedorMovimiento';
import { SaltarAlContenido } from '@/components/ui/SaltarAlContenido';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  // || y no ??: en Vercel la variable puede existir vacía, y una página sin título no cumple WCAG 2.4.2.
  title: process.env.NEXT_PUBLIC_APP_NAME || 'Gym Assistant',
  description: 'Sistema fullstack TypeScript para gestión de gimnasio y asistente de entrenamiento.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="antialiased bg-transparent text-slate-900">
        <SaltarAlContenido />
        <ProveedorMovimiento>{children}</ProveedorMovimiento>
      </body>
    </html>
  );
}
