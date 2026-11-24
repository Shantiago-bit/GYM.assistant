import { redirect } from 'next/navigation';
import { HolaMundo } from '@/components/home/HolaMundo';
import { IntroKairos } from '@/components/marca/IntroKairos';
import { EfectosPuntero } from '@/components/movimiento/EfectosPuntero';
import { obtenerSesion } from '@/lib/dataService';

export default async function HomePage() {
  const sesion = await obtenerSesion();

  if (sesion) {
    redirect('/gym');
  }

  return (
    <main id="contenido" tabIndex={-1} className="relative min-h-screen overflow-hidden">
      <HolaMundo />
      <IntroKairos />
      <EfectosPuntero />
    </main>
  );
}
