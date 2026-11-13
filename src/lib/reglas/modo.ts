import { rangoPorTipo, type Enfoque, type TipoEjercicio } from '@/lib/reglas/ejercicio';
import type { Metodo } from '@/lib/reglas/metodos';

// Modo sencillo: al crear un ejercicio solo se pide el nombre y si es con peso o con el cuerpo. El resto
// toma estos valores, los mismos que propone el modo avanzado si no se cambia nada: ganar músculo
// (hipertrofia), series rectas y las repeticiones objetivo de hipertrofia. La progresión no cambia.
export const ENFOQUE_SENCILLO: Enfoque = 'hipertrofia';
export const METODO_SENCILLO: Metodo = 'rectas';

export interface ValoresSencillos {
  enfoque: Enfoque;
  metodo: Metodo;
  rangoMin: number;
  rangoMax: number;
  // En peso, el punto de partida lo fija la primera medición (su serie más pesada); hasta entonces es 0.
  pesoRefKg: number | undefined;
}

export function valoresSencillos(tipo: TipoEjercicio): ValoresSencillos {
  const [rangoMin, rangoMax] = rangoPorTipo(tipo, ENFOQUE_SENCILLO);
  return {
    enfoque: ENFOQUE_SENCILLO,
    metodo: METODO_SENCILLO,
    rangoMin,
    rangoMax,
    pesoRefKg: tipo === 'peso' ? 0 : undefined,
  };
}
