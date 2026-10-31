export interface SerieMedida {
  reps: number;
  pesoGramos: number | null;
}

export type IndicadorProgreso = 'mejora' | 'estable' | 'baja';

// Positivo si a es mejor que b: manda el peso y, con el mismo peso, las repeticiones.
function compararSeries(a: SerieMedida, b: SerieMedida): number {
  return (a.pesoGramos ?? 0) - (b.pesoGramos ?? 0) || a.reps - b.reps;
}

export function mejorSerie(series: SerieMedida[]): SerieMedida | null {
  return series.reduce<SerieMedida | null>(
    (mejor, serie) => (mejor === null || compararSeries(serie, mejor) > 0 ? serie : mejor),
    null,
  );
}

export function indicadorProgreso(inicial: SerieMedida, final: SerieMedida): IndicadorProgreso {
  const diferencia = compararSeries(final, inicial);

  if (diferencia > 0) return 'mejora';
  if (diferencia < 0) return 'baja';
  return 'estable';
}

export interface PuntoTendencia {
  fecha: string;
  mejor: SerieMedida;
  indicador: IndicadorProgreso | null;
}

// Recibe las sesiones de la más antigua a la más reciente. indicador es null en la primera.
export function tendenciaDeSesiones(
  sesiones: { fecha: string; series: SerieMedida[] }[],
): PuntoTendencia[] {
  const puntos: PuntoTendencia[] = [];

  for (const sesion of sesiones) {
    const mejor = mejorSerie(sesion.series);
    if (!mejor) continue;

    const anterior = puntos.at(-1);
    puntos.push({
      fecha: sesion.fecha,
      mejor,
      indicador: anterior ? indicadorProgreso(anterior.mejor, mejor) : null,
    });
  }

  return puntos;
}
