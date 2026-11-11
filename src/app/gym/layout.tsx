import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { NavegacionGym } from '@/components/gym/NavegacionGym';
import { PantallaCompletarPerfil } from '@/components/gym/PantallaCompletarPerfil';
import { PantallaEsperaAutorizacion } from '@/components/gym/PantallaEsperaAutorizacion';
import { ProveedorGuia } from '@/components/guia/ProveedorGuia';
import { obtenerPerfil, obtenerSesion, urlFirmadaAvatar } from '@/lib/dataService';
import { nombreParaMostrar } from '@/lib/reglas/perfil';

// Pantallas sueltas (completar el perfil, esperar la autorización): sin menú ni guía.
function Suelta({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-fondo text-texto">
      <main className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}

export default async function GymLayout({ children }: { children: ReactNode }) {
  const sesion = await obtenerSesion();

  if (!sesion) {
    redirect('/login');
  }

  // El layout hace de puerta: en lugar de redirigir (lo que deja en bucle la navegación del cliente, porque
  // el layout es el mismo en el origen y el destino), muestra la pantalla que corresponde en cualquier ruta.
  const perfil = await obtenerPerfil(sesion.id);

  // Las cuentas creadas antes del registro en dos pasos no tienen perfil: lo completan antes de seguir.
  if (!perfil) {
    return (
      <Suelta>
        <PantallaCompletarPerfil />
      </Suelta>
    );
  }

  // Menores cuyo tutor aún no autoriza la cuenta: solo ven la pantalla de espera.
  if (perfil.autorizacion === 'pendiente' || perfil.autorizacion === 'rechazada') {
    return (
      <Suelta>
        <PantallaEsperaAutorizacion perfil={perfil} />
      </Suelta>
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
