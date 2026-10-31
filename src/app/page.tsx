import { redirect } from 'next/navigation';
import { HolaMundo } from '@/components/home/HolaMundo';
import { obtenerSesion } from '@/lib/dataService';

export default async function HomePage() {
  const sesion = await obtenerSesion();

  if (sesion) {
    redirect('/gym');
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <HolaMundo />
    </main>
  );
}
