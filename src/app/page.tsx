import { redirect } from 'next/navigation';
import { obtenerSesion } from '@/lib/dataService';

export default async function HomePage() {
  const sesion = await obtenerSesion();

  redirect(sesion ? '/gym' : '/login');
}
