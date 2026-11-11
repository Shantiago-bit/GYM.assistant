import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { NavegacionGym } from '@/components/gym/NavegacionGym';
import { ProveedorGuia } from '@/components/guia/ProveedorGuia';
import { obtenerPerfil, obtenerSesion, urlFirmadaAvatar } from '@/lib/dataService';
import { nombreParaMostrar } from '@/lib/reglas/perfil';

const RUTA_COMPLETAR = '/gym/perfil/completar';

export default async function GymLayout({ children }: { children: ReactNode }) {
  const sesion = await obtenerSesion();

  if (!sesion) {
    redirect('/login');
  }

  // Las cuentas creadas antes del registro en dos pasos no tienen perfil: lo completan antes de seguir.
  const perfil = await obtenerPerfil(sesion.id);
  if (!perfil) {
    const ruta = (await headers()).get('x-ruta') ?? '';
    if (!ruta.startsWith(RUTA_COMPLETAR)) {
      redirect(RUTA_COMPLETAR);
    }
    return (
      <div className="min-h-screen bg-fondo text-texto">
        <main className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">{children}</main>
      </div>
    );
  }

  const avatarUrl = await urlFirmadaAvatar(perfil.avatarRuta);

  return (
    <ProveedorGuia>
      <div className="min-h-screen bg-fondo text-texto">
        <NavegacionGym nombre={nombreParaMostrar(perfil.nombre, perfil.apodo)} avatarUrl={avatarUrl} />
        <main className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          {children}
        </main>
      </div>
    </ProveedorGuia>
  );
}
