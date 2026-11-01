import Link from 'next/link';
import { TarjetaEjercicio } from '@/components/gym/TarjetaEjercicio';
import { clasesBoton } from '@/components/ui/Boton';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { exigirSesionDePagina } from '@/lib/auth/sesion';
import { listarEjercicios } from '@/lib/dataService';

export default async function GymPage({
  searchParams,
}: {
  searchParams: Promise<{ archivados?: string }>;
}) {
  const { id: usuarioId } = await exigirSesionDePagina();
  const { archivados } = await searchParams;
  const incluirArchivados = archivados === '1';
  const ejercicios = await listarEjercicios(usuarioId, { incluirArchivados });

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-texto">Ejercicios</h1>
        <Link href="/gym/ejercicios/nuevo" className={clasesBoton()}>
          Nuevo ejercicio
        </Link>
      </div>

      {ejercicios.length === 0 ? (
        <EstadoVacio
          titulo="Aún no hay ejercicios"
          descripcion="Registra tu primer ejercicio para empezar a medir tu progreso."
        />
      ) : (
        <ul className="space-y-3">
          {ejercicios.map((ejercicio) => (
            <li key={ejercicio.id}>
              <TarjetaEjercicio ejercicio={ejercicio} />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-5 text-center text-sm">
        <Link
          href={incluirArchivados ? '/gym' : '/gym?archivados=1'}
          className="font-medium text-primario underline-offset-4 hover:underline"
        >
          {incluirArchivados ? 'Ocultar archivados' : 'Ver archivados'}
        </Link>
      </p>
    </>
  );
}
