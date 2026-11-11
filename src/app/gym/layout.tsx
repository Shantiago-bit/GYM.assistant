import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { NavegacionGym } from '@/components/gym/NavegacionGym';
import { ProveedorGuia } from '@/components/guia/ProveedorGuia';
import { obtenerSesion } from '@/lib/dataService';

export default async function GymLayout({ children }: { children: ReactNode }) {
  const sesion = await obtenerSesion();

  if (!sesion) {
    redirect('/login');
  }

  return (
    <ProveedorGuia>
      <div className="min-h-screen bg-fondo text-texto">
        <NavegacionGym email={sesion.email} />
        <main className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          {children}
        </main>
      </div>
    </ProveedorGuia>
  );
}
