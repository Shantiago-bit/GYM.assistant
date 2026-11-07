// Estimación del máximo de una repetición (1RM) con la fórmula de Epley: peso × (1 + reps / 30).
// Si se conoce el RIR, se usan las repeticiones que la serie permitía (reps + RIR): una serie
// cómoda dice más de tu fuerza que las repeticiones que hiciste.

export interface SerieFuerza {
  reps: number;
  pesoGramos: number | null;
  rir?: number | null;
}

// Por encima de unas 12 repeticiones la fórmula pierde precisión; se acota para no inflar la estimación.
const REPS_MAXIMAS_ESTIMACION = 12;

export function estimar1RM(serie: SerieFuerza): number | null {
  if (serie.pesoGramos === null || serie.pesoGramos <= 0 || serie.reps <= 0) {
    return null;
  }

  const reps = Math.min(serie.reps + (serie.rir ?? 0), REPS_MAXIMAS_ESTIMACION);

  return reps === 1 ? serie.pesoGramos : Math.round(serie.pesoGramos * (1 + reps / 30));
}

export function mejor1RM(series: SerieFuerza[]): number | null {
  return series.reduce<number | null>((mejor, serie) => {
    const estimado = estimar1RM(serie);
    return estimado !== null && (mejor === null || estimado > mejor) ? estimado : mejor;
  }, null);
}

export interface Punto1RM {
  fecha: string;
  gramos: number;
}

// Recibe las sesiones en cualquier orden y devuelve un punto por sesión, de la más antigua a la más reciente.
export function serie1RM(sesiones: { fecha: string; series: SerieFuerza[] }[]): Punto1RM[] {
  return sesiones
    .map((sesion) => ({ fecha: sesion.fecha, gramos: mejor1RM(sesion.series) }))
    .filter((punto): punto is Punto1RM => punto.gramos !== null)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
