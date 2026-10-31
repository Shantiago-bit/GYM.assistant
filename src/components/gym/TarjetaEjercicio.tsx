import Link from 'next/link';
import { InsigniaTipo } from '@/components/gym/InsigniaTipo';
import { Insignia } from '@/components/ui/Insignia';
import { Tarjeta } from '@/components/ui/Tarjeta';
import type { FilaEjercicio } from '@/lib/dataService';
import { formatearFecha, formatearPeso } from '@/lib/formato';

export function estadoActual(ejercicio: FilaEjercicio): string {
  if (ejercicio.tipo === 'peso') {
    return formatearPeso(ejercicio.pesoRefGramos ?? 0);
  }

  return ejercicio.nivel ?? 'Sin nivel definido';
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-texto-suave">{etiqueta}</dt>
      <dd className="font-medium tabular-nums text-texto">{valor}</dd>
    </div>
  );
}

export function TarjetaEjercicio({ ejercicio }: { ejercicio: FilaEjercicio }) {
  const [min, max] = ejercicio.rango;

  return (
    <Link
      href={`/gym/ejercicios/${ejercicio.id}`}
      className="block rounded-gym transition hover:brightness-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
    >
      <Tarjeta>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-texto">{ejercicio.nombre}</h2>
          <div className="flex gap-2">
            {ejercicio.archivado ? <Insignia>Archivado</Insignia> : null}
            <InsigniaTipo tipo={ejercicio.tipo} />
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Dato etiqueta="Rango objetivo" valor={`${min}–${max} reps`} />
          <Dato etiqueta={ejercicio.tipo === 'peso' ? 'Peso actual' : 'Nivel'} valor={estadoActual(ejercicio)} />
          <Dato etiqueta="Meta" valor={`${ejercicio.metaReps} reps`} />
          <Dato
            etiqueta="Última sesión"
            valor={ejercicio.ultimaFecha ? formatearFecha(ejercicio.ultimaFecha) : 'Sin sesiones'}
          />
        </dl>
      </Tarjeta>
    </Link>
  );
}
