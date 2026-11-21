import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { exigirAdminDePagina } from '@/lib/auth/admin';

export const metadata: Metadata = {
  title: 'Administración · Gym Assistant',
  robots: { index: false, follow: false },
};

// El panel se calcula en cada visita (la puerta depende de la sesión); las estadísticas tienen su propia caché.
export const dynamic = 'force-dynamic';

// Layout propio de /admin: no usa el de /gym ni exige el perfil completo. Quien no administra recibe un 404.
// /admin/seguridad entra sin la verificación en dos pasos (es donde se hace); el resto del panel la exige en
// (panel)/layout.tsx y en cada página.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await exigirAdminDePagina({ permitirSinVerificar: true });
  return <div className="tema-admin">{children}</div>;
}
