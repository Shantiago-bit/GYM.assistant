import Link from 'next/link';
import { InsigniaTipo } from '@/components/gym/InsigniaTipo';
import { Insignia } from '@/components/ui/Insignia';
import { clasesBoton } from '@/components/ui/Boton';
import type { EjercicioListado, FilaEjercicio } from '@/lib/dataService';
import { formatearFecha, formatearPeso } from '@/lib/formato';
import { textoEnfoque } from '@/lib/reglas/ejercicio';

export function estadoActual(ejercicio: FilaEjercicio): string {
  if (ejercicio.tipo === 'peso') {
    return formatearPeso(ejercicio.pesoRefGramos ?? 0);
  }

  return ejercicio.nivel ?? 'Sin nivel definido';
}

type Estado = 'archivado' | 'sin_prueba' | 'listo' | 'en_progreso';

function estadoDe(ejercicio: EjercicioListado): Estado {
  if (ejercicio.archivado) return 'archivado';
  // La prueba inicial es la primera sesión del ejercicio.
  if (ejercicio.totalSesiones === 0) return 'sin_prueba';
  return ejercicio.listoParaSubir ? 'listo' : 'en_progreso';
}

const BORDE: Record<Estado, string> = {
  archivado: 'border-l-borde',
  sin_prueba: 'border-l-mantener',
  listo: 'border-l-subir',
  en_progreso: 'border-l-primario',
};

function InsigniaEstado({ estado }: { estado: Estado }) {
  switch (estado) {
    case 'archivado':
      return <Insignia>Archivado</Insignia>;
    case 'sin_prueba':
      return <Insignia tono="mantener">Falta prueba inicial</Insignia>;
    case 'listo':
      return <Insignia tono="subir">Listo para subir</Insignia>;
    case 'en_progreso':
      return null;
  }
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-texto-suave">{etiqueta}</dt>
      <dd className="truncate font-medium tabular-nums text-texto">{valor}</dd>
    </div>
  );
}

export function TarjetaEjercicio({ ejercicio }: { ejercicio: EjercicioListado }) {
  const [min, max] = ejercicio.rango;
  const estado = estadoDe(ejercicio);
  const detalle = `/gym/ejercicios/${ejercicio.id}` as const;
  const esPeso = ejercicio.tipo === 'peso';

  return (
    <article
      className={`rounded-gym border border-l-4 border-borde bg-superficie p-4 shadow-sm transition hover:shadow-md ${BORDE[estado]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-texto">
            <Link
              href={detalle}
              className="rounded underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
            >
              {ejercicio.nombre}
            </Link>
          </h2>
          <div className="mt-1 flex flex-wrap gap-2">
            <InsigniaTipo tipo={ejercicio.tipo} />
            <Insignia>{textoEnfoque(ejercicio.enfoque)}</Insignia>
            <InsigniaEstado estado={estado} />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-texto-suave">{esPeso ? 'Peso actual' : 'Nivel'}</p>
          <p
            className={`font-bold tabular-nums text-texto ${esPeso ? 'text-2xl' : 'max-w-36 truncate text-base'}`}
            title={estadoActual(ejercicio)}
          >
            {estadoActual(ejercicio)}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-borde pt-3 text-sm">
        <Dato etiqueta="Rango" valor={`${min}–${max} reps`} />
        <Dato etiqueta="Meta" valor={`${ejercicio.metaReps} reps`} />
        <Dato
          etiqueta="Última sesión"
          valor={ejercicio.ultimaFecha ? formatearFecha(ejercicio.ultimaFecha) : '—'}
        />
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {estado === 'archivado' ? null : (
          <Link
            href={estado === 'sin_prueba' ? `${detalle}/prueba` : `${detalle}/sesion`}
            className={`${clasesBoton('primario')} flex-1 sm:flex-none`}
          >
            {estado === 'sin_prueba' ? 'Hacer prueba inicial' : 'Registrar sesión'}
          </Link>
        )}
        <Link href={detalle} className={`${clasesBoton('secundario')} flex-1 sm:flex-none`}>
          Ver detalle
        </Link>
      </div>
    </article>
  );
}
