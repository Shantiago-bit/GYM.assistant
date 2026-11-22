import type { Route } from 'next';
import Link from 'next/link';
import { NumeroAnimado } from '@/components/ui/Movimiento';
import { formatearPeso } from '@/lib/formato';
import { haceDias, type SemanaVolumen, type UltimoRecord } from '@/lib/reglas/inicio';

const FORMATO_NUMERO = new Intl.NumberFormat('es-CO');
const FOCO =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario';
const TARJETA_TOCABLE = `group block h-full rounded-tarjeta border border-borde bg-superficie p-4 shadow-suave transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-primario hover:shadow-elevada motion-reduce:transform-none ${FOCO}`;

export function Inicial({
  nombre,
  tipo,
  tamano = 'normal',
}: {
  nombre: string;
  tipo: 'peso' | 'calistenia';
  tamano?: 'mini' | 'normal';
}) {
  const medida =
    tamano === 'mini' ? 'h-8 w-8 text-xs ring-2 ring-superficie' : 'h-11 w-11 text-base';
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold uppercase text-white ${medida} ${
        tipo === 'peso' ? 'bg-peso' : 'bg-calistenia'
      }`}
    >
      {nombre.trim().charAt(0) || '·'}
    </span>
  );
}

// "Listos para subir": número grande y los ejercicios en miniatura; al tocarla, la lista muestra solo esos.
export function TarjetaListos({
  listos,
}: {
  listos: { id: string; nombre: string; tipo: 'peso' | 'calistenia' }[];
}) {
  const visibles = listos.slice(0, 4);
  const resto = listos.length - visibles.length;
  const contenido = (
    <>
      <h3 className="text-sm font-semibold text-texto-suave">Listos para subir</h3>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="font-titulos text-4xl font-bold tabular-nums text-subir">
          <NumeroAnimado valor={listos.length} />
        </p>
        {visibles.length > 0 ? (
          <span className="flex -space-x-2">
            {visibles.map((ejercicio) => (
              <Inicial
                key={ejercicio.id}
                nombre={ejercicio.nombre}
                tipo={ejercicio.tipo}
                tamano="mini"
              />
            ))}
            {resto > 0 ? (
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primario-suave text-xs font-bold text-primario ring-2 ring-superficie"
              >
                +{resto}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-texto-suave">
        {listos.length === 0
          ? 'Ninguno todavía: sigue sumando repeticiones.'
          : `${listos
              .map((ejercicio) => ejercicio.nombre)
              .slice(0, 3)
              .join(', ')}${listos.length > 3 ? '…' : ''}`}
      </p>
    </>
  );
  if (listos.length === 0) {
    return (
      <div className="h-full rounded-tarjeta border border-borde bg-superficie p-4 shadow-suave">
        {contenido}
      </div>
    );
  }
  return (
    <Link
      href="/gym?listos=1#mis-ejercicios"
      className={TARJETA_TOCABLE}
      aria-label={`Listos para subir: ${listos.length}. Ver solo esos ejercicios`}
    >
      {contenido}
    </Link>
  );
}

// Mini gráfico de barras propio: el volumen de cada semana; la actual, en el color principal.
function MiniBarras({ semanas }: { semanas: SemanaVolumen[] }) {
  const maximo = Math.max(1, ...semanas.map((semana) => semana.volumenKg));
  const ancho = 14;
  const separacion = 8;
  const alto = 44;
  const descripcion = `Volumen de las últimas ${semanas.length} semanas, de la más antigua a esta: ${semanas
    .map((semana) => `${FORMATO_NUMERO.format(semana.volumenKg)} kg`)
    .join(', ')}`;
  return (
    <svg
      viewBox={`0 0 ${semanas.length * (ancho + separacion) - separacion} ${alto}`}
      className="h-11 w-auto"
      role="img"
      aria-label={descripcion}
    >
      {semanas.map((semana, indice) => {
        const altura = Math.max(3, (semana.volumenKg / maximo) * alto);
        const actual = indice === semanas.length - 1;
        return (
          <rect
            key={semana.inicio}
            x={indice * (ancho + separacion)}
            y={alto - altura}
            width={ancho}
            height={altura}
            rx={4}
            fill={actual ? 'var(--color-primario)' : 'var(--color-lavanda)'}
            className="anim-crecer"
            style={{ animationDelay: `${indice * 60}ms` }}
          />
        );
      })}
    </svg>
  );
}

export function TarjetaEstaSemana({
  actual,
  semanas,
}: {
  actual: SemanaVolumen;
  semanas: SemanaVolumen[];
}) {
  return (
    <div className="flex h-full flex-col rounded-tarjeta border border-borde bg-superficie p-4 shadow-suave">
      <h3 className="text-sm font-semibold text-texto-suave">Esta semana</h3>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <p className="font-titulos text-3xl font-bold tabular-nums text-texto">
            <NumeroAnimado
              valor={actual.sesiones}
              sufijo={actual.sesiones === 1 ? ' sesión' : ' sesiones'}
            />
          </p>
          <p className="text-sm text-texto-suave">
            <NumeroAnimado valor={actual.volumenKg} sufijo=" kg de volumen" />
          </p>
        </div>
        <MiniBarras semanas={semanas} />
      </div>
    </div>
  );
}

export function TarjetaUltimoRecord({
  record,
  avanzado,
}: {
  record: UltimoRecord | null;
  avanzado: boolean;
}) {
  if (!record) {
    return (
      <div className="h-full rounded-tarjeta border border-dashed border-borde bg-superficie p-4">
        <h3 className="text-sm font-semibold text-texto-suave">Último récord</h3>
        <p className="mt-2 text-sm text-texto">
          Anota tus sesiones y aquí verás tu mejor marca más reciente.
        </p>
      </div>
    );
  }
  const valor =
    record.tipo === 'peso'
      ? `${formatearPeso(record.valor)}${record.reps ? ` × ${record.reps}` : ''}`
      : `${record.valor} ${avanzado ? 'reps' : 'repeticiones'}`;
  return (
    <Link href={`/gym/ejercicios/${record.ejercicioId}` as Route} className={TARJETA_TOCABLE}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-texto-suave">Último récord</h3>
        {record.nuevo ? (
          <span className="rounded-full bg-acento px-2.5 py-0.5 text-xs font-bold text-white">
            Nuevo
          </span>
        ) : (
          <span aria-hidden="true" className="text-xl">
            🏆
          </span>
        )}
      </div>
      <p className="mt-2 font-titulos text-2xl font-bold tabular-nums text-texto">{valor}</p>
      <p className="truncate text-sm font-medium text-texto group-hover:text-primario">
        {record.nombre}
      </p>
      <p className="text-sm text-texto-suave">{haceDias(record.diasDesde)}</p>
    </Link>
  );
}
