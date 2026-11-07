import Link from 'next/link';
import { BotonArchivar } from '@/components/gym/BotonArchivar';
import { EditarEnfoque } from '@/components/gym/EditarEnfoque';
import { EditarNivel } from '@/components/gym/EditarNivel';
import { HistorialSesiones } from '@/components/gym/HistorialSesiones';
import { InsigniaTipo } from '@/components/gym/InsigniaTipo';
import { Progreso1RM } from '@/components/gym/Progreso1RM';
import { estadoActual } from '@/components/gym/TarjetaEjercicio';
import { TarjetaRecomendacion } from '@/components/gym/TarjetaRecomendacion';
import { TendenciaProgreso } from '@/components/gym/TendenciaProgreso';
import { clasesBoton } from '@/components/ui/Boton';
import { Insignia } from '@/components/ui/Insignia';
import { textoEnfoque } from '@/lib/reglas/ejercicio';
import { textoMetodo } from '@/lib/reglas/metodos';
import { cargarEjercicio } from './cargar';

export default async function DetalleEjercicioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ejercicio, tienePruebaInicial, sesiones, recomendacion, plan } = await cargarEjercicio(id);
  const [min, max] = ejercicio.rango;

  return (
    <>
      <Link href="/gym" className="text-sm font-medium text-primario underline-offset-4 hover:underline">
        Volver a ejercicios
      </Link>

      <div className="mb-1 mt-2 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-texto">{ejercicio.nombre}</h1>
        <InsigniaTipo tipo={ejercicio.tipo} />
        <Insignia>{textoEnfoque(ejercicio.enfoque)}</Insignia>
        <Insignia>{textoMetodo(ejercicio.metodo)}</Insignia>
        {ejercicio.archivado ? <Insignia>Archivado</Insignia> : null}
      </div>
      <p className="mb-5 text-sm tabular-nums text-texto-suave">
        {estadoActual(ejercicio)} · Rango {min}–{max} reps · Meta {ejercicio.metaReps} reps
      </p>

      <TarjetaRecomendacion recomendacion={recomendacion} sinPrueba={!tienePruebaInicial} plan={plan} />

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
          <EditarEnfoque
            id={id}
            tipo={ejercicio.tipo}
            enfoqueActual={ejercicio.enfoque}
            metodoActual={ejercicio.metodo}
            rangoActual={ejercicio.rango}
          />
          {ejercicio.tipo === 'calistenia' ? (
            <EditarNivel id={id} nivelActual={ejercicio.nivel} />
          ) : null}
          <BotonArchivar id={id} nombre={ejercicio.nombre} />
        </div>
      )}

      {ejercicio.tipo === 'peso' ? <Progreso1RM sesiones={sesiones} /> : null}

      <TendenciaProgreso sesiones={sesiones} />

      <h2 className="mb-3 mt-8 text-lg font-semibold text-texto">Histórico</h2>
      <HistorialSesiones sesiones={sesiones} />
    </>
  );
}
