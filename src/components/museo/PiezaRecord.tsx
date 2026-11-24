import { formatearFecha, formatearPeso } from '@/lib/formato';
import type { MarcaPersonal, RecordEjercicio } from '@/lib/reglas/perfil';

// Una pieza de la "Sala de récords": el ejercicio, la marca y la fecha, sobre un pedestal (base con degradado y un
// brillo arriba). Los récords son los mismos del perfil (recordsPersonales).
function Marca({ etiqueta, valor, marca }: { etiqueta: string; valor: string; marca: MarcaPersonal }) {
  return (
    <div>
      <dt className="text-sm text-texto-suave">{etiqueta}</dt>
      <dd>
        <span className="block text-2xl font-bold tabular-nums text-texto">{valor}</span>
        <span className="text-sm text-texto-suave">
          {formatearFecha(marca.fecha)}
          {marca.nuevo ? (
            <span className="ml-2 rounded-full bg-primario-suave px-2 py-0.5 font-semibold text-primario">Nuevo</span>
          ) : null}
        </span>
      </dd>
    </div>
  );
}

export function PiezaRecord({ record, avanzado }: { record: RecordEjercicio; avanzado: boolean }) {
  return (
    <li className="flex flex-col">
      <article className="relative flex-1 rounded-t-tarjeta border border-b-0 border-borde bg-superficie px-4 pb-4 pt-5">
        <h3 className="font-titulos text-lg font-bold text-texto">{record.nombre}</h3>
        <dl className="mt-3 space-y-3">
          {record.tipo === 'peso' ? (
            <>
              <Marca
                etiqueta="Mayor peso"
                valor={`${formatearPeso(record.mayorPeso.valor)} × ${record.mayorPeso.reps}`}
                marca={record.mayorPeso}
              />
              {record.mejor1RM ? (
                <Marca
                  etiqueta={avanzado ? 'Mejor 1RM estimado' : 'Mejor peso máximo estimado'}
                  valor={formatearPeso(Math.round(record.mejor1RM.valor / 100) * 100)}
                  marca={record.mejor1RM}
                />
              ) : null}
            </>
          ) : (
            <Marca
              etiqueta={`Máximo de repeticiones${record.variante ? ` (${record.variante})` : ''}`}
              valor={`${record.maxReps.valor} reps`}
              marca={record.maxReps}
            />
          )}
        </dl>
      </article>
      {/* El pedestal: decorativo. */}
      <div aria-hidden="true" className="pedestal-museo h-5 rounded-b-tarjeta" />
    </li>
  );
}
