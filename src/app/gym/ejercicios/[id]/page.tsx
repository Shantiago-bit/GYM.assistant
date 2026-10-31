import Link from 'next/link';
import { BotonArchivar } from '@/components/gym/BotonArchivar';
import { HistorialSesiones } from '@/components/gym/HistorialSesiones';
import { InsigniaTipo } from '@/components/gym/InsigniaTipo';
import { estadoActual } from '@/components/gym/TarjetaEjercicio';
import { TarjetaRecomendacion } from '@/components/gym/TarjetaRecomendacion';
import { clasesBoton } from '@/components/ui/Boton';
import { Insignia } from '@/components/ui/Insignia';
import { cargarEjercicio } from './cargar';

export default async function DetalleEjercicioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ejercicio, tienePruebaInicial, sesiones, recomendacion } = await cargarEjercicio(id);
  const [min, max] = ejercicio.rango;

  return (
    <>
      <Link href="/gym" className="text-sm font-medium text-primario underline-offset-4 hover:underline">
        Volver a ejercicios
      </Link>

      <div className="mb-1 mt-2 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-texto">{ejercicio.nombre}</h1>
        <InsigniaTipo tipo={ejercicio.tipo} />
        {ejercicio.archivado ? <Insignia>Archivado</Insignia> : null}
      </div>
      <p className="mb-5 text-sm tabular-nums text-texto-suave">
        {estadoActual(ejercicio)} · Rango {min}–{max} reps · Meta {ejercicio.metaReps} reps
      </p>

      <TarjetaRecomendacion recomendacion={recomendacion} sinPrueba={!tienePruebaInicial} />

      {ejercicio.archivado ? null : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {tienePruebaInicial ? null : (
            <Link href={`/gym/ejercicios/${id}/prueba`} className={clasesBoton()}>
              Registrar prueba inicial
            </Link>
          )}
          <Link
            href={`/gym/ejercicios/${id}/sesion`}
            className={clasesBoton(tienePruebaInicial ? 'primario' : 'secundario')}
          >
            Registrar sesión
          </Link>
          <BotonArchivar id={id} nombre={ejercicio.nombre} />
        </div>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold text-texto">Histórico</h2>
      <HistorialSesiones sesiones={sesiones} />
    </>
  );
}
