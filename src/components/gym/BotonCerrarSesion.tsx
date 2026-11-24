'use client';

import { useRouter } from 'next/navigation';
import { Boton } from '@/components/ui/Boton';
import { supabase } from '@/lib/supabase';

// Cierra la sesión y vuelve al login (pantallas sueltas de /gym, como la de cuenta suspendida).
export function BotonCerrarSesion() {
  const router = useRouter();
  return (
    <Boton
      variante="secundario"
      onClick={async () => {
        await supabase?.auth.signOut();
        router.push('/login');
        router.refresh();
      }}
    >
      Cerrar sesión
    </Boton>
  );
}
