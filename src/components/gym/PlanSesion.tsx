import type { PlanSerie } from '@/lib/datos/tipos';
import { formatearPeso } from '@/lib/formato';

function textoReps(serie: PlanSerie): string {
  return serie.repsMin === serie.repsMax ? `${serie.repsMin} reps` : `${serie.repsMin}–${serie.repsMax} reps`;
}

// Lista de la próxima sesión: una fila por serie con su peso y sus repeticiones objetivo.
export function PlanSesion({ plan }: { plan: PlanSerie[] }) {
  return (
    <ol className="divide-y divide-borde rounded-gym border border-borde bg-superficie text-sm tabular-nums">
      {plan.map((serie, indice) => (
        <li key={indice} className="flex items-center justify-between gap-3 px-3 py-1.5">
          <span className="flex items-center gap-2 text-texto-suave">
            Serie {indice + 1}
            {serie.etiqueta ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  serie.clave ? 'bg-primario-suave text-texto' : 'border border-borde text-texto-suave'
                }`}
              >
                {serie.etiqueta}
              </span>
            ) : null}
          </span>
          <span className="font-medium text-texto">
            {serie.pesoGramos === null ? '' : `${formatearPeso(serie.pesoGramos)} × `}
            {textoReps(serie)}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function NotaMetodo({ plan }: { plan: PlanSerie[] }) {
  if (plan.some((serie) => serie.etiqueta === 'Cluster')) {
    return (
      <p className="mt-2 text-xs text-texto-suave">
        Cluster: divide cada serie en bloques de 1–2 repeticiones con 15–30 s de pausa y anota el total.
      </p>
    );
  }
  if (plan.some((serie) => !serie.clave)) {
    return (
      <p className="mt-2 text-xs text-texto-suave">
        La progresión se decide con la serie resaltada; las demás se calculan a partir de su peso.
      </p>
    );
  }
  return null;
}
