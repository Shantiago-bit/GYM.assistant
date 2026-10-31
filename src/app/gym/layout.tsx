import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { NavegacionGym } from '@/components/gym/NavegacionGym';
import { obtenerSesion } from '@/lib/dataService';

export default async function GymLayout({ children }: { children: ReactNode }) {
  const sesion = await obtenerSesion();

  if (!sesion) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-fondo text-texto">
      <NavegacionGym email={sesion.email} />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
