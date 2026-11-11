import { redirect } from 'next/navigation';
import { FormularioCompletarPerfil } from '@/components/gym/FormularioCompletarPerfil';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { exigirSesionDePagina } from '@/lib/auth/sesion';
import { obtenerPerfil } from '@/lib/dataService';

export const metadata = { title: 'Completa tu perfil · Gym Assistant' };

export default async function CompletarPerfilPage() {
  const sesion = await exigirSesionDePagina();
  if (await obtenerPerfil(sesion.id)) {
    redirect('/gym/perfil');
  }

  return (
    <Tarjeta className="p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primario">Gym Assistant</p>
      <h1 className="mt-2 text-2xl font-bold text-texto">Completa tu perfil</h1>
      <p className="mb-5 mt-1 text-sm text-texto-suave">
        Antes de seguir, cuéntanos cómo te llamas y cuándo naciste. Solo te lo pediremos una vez.
      </p>
      <FormularioCompletarPerfil />
    </Tarjeta>
  );
}
