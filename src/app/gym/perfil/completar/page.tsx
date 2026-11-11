import { redirect } from 'next/navigation';
import { exigirSesionDePagina } from '@/lib/auth/sesion';
import { obtenerPerfil } from '@/lib/dataService';

export const metadata = { title: 'Completa tu perfil · Gym Assistant' };

// Sin perfil, el layout de /gym ya muestra "Completa tu perfil" en lugar de esta página; con perfil, no hay
// nada que completar.
export default async function CompletarPerfilPage() {
  const sesion = await exigirSesionDePagina();
  if (await obtenerPerfil(sesion.id)) {
    redirect('/gym/perfil');
  }
  return null;
}
