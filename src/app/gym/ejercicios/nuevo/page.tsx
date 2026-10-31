import Link from 'next/link';
import { FormularioEjercicio } from '@/components/gym/FormularioEjercicio';
import { Tarjeta } from '@/components/ui/Tarjeta';

export default function NuevoEjercicioPage() {
  return (
    <>
      <Link href="/gym" className="text-sm font-medium text-primario underline-offset-4 hover:underline">
        Volver a ejercicios
      </Link>
      <h1 className="mb-5 mt-2 text-2xl font-bold text-texto">Nuevo ejercicio</h1>
      <Tarjeta>
        <FormularioEjercicio />
      </Tarjeta>
    </>
  );
}
