import type { PlanSerie } from '@/lib/datos/tipos';
import { formatearPeso } from '@/lib/formato';

// Avanzado: "8–12 reps". Sencillo: "8 a 12 repeticiones".
function textoReps(serie: PlanSerie, avanzado: boolean): string {
  if (avanzado) {
    return serie.repsMin === serie.repsMax ? `${serie.repsMin} reps` : `${serie.repsMin}–${serie.repsMax} reps`;
  }
  const plural = serie.repsMax === 1 ? 'repetición' : 'repeticiones';
  return serie.repsMin === serie.repsMax ? `${serie.repsMin} ${plural}` : `${serie.repsMin} a ${serie.repsMax} ${plural}`;
}

// Lista de la próxima sesión: una fila por serie con su peso y sus repeticiones objetivo.
export function PlanSesion({ plan, avanzado = false }: { plan: PlanSerie[]; avanzado?: boolean }) {
  return (
    <ol className="divide-y divide-borde rounded-gym border border-borde bg-superficie text-sm tabular-nums">
      {plan.map((serie, indice) => (
        <li key={indice} className="flex items-center justify-between gap-3 px-3 py-1.5">
          <span className="flex items-center gap-2 text-texto-suave">
            Serie {indice + 1}
            {serie.etiqueta ? (
              <span
                className={`rounded-full px-2 py-0.5 text-sm font-medium ${
                  serie.clave ? 'bg-primario-suave text-texto' : 'border border-borde text-texto-suave'
                }`}
              >
                {serie.etiqueta}
              </span>
            ) : null}
          </span>
          <span className="font-medium text-texto">
            {serie.pesoGramos === null ? '' : `${formatearPeso(serie.pesoGramos)} × `}
            {textoReps(serie, avanzado)}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function NotaMetodo({ plan }: { plan: PlanSerie[] }) {
  if (plan.some((serie) => serie.etiqueta === 'Cluster')) {
    return (
      <p className="mt-2 text-sm text-texto-suave">
        Cluster: divide cada serie en bloques de 1–2 repeticiones con 15–30 s de pausa y anota el total.
      </p>
    );
  }
  if (plan.some((serie) => !serie.clave)) {
    return (
      <p className="mt-2 text-sm text-texto-suave">
        La progresión se decide con la serie resaltada; las demás se calculan a partir de su peso.
      </p>
    );
  }
  return null;
}
