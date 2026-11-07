import {
  INCREMENTO_PESO_ALTO_GRAMOS,
  INCREMENTO_PESO_GRAMOS,
  REDUCCION_DESCARGA,
  RIR_SALTO_DOBLE,
  UMBRAL_PESO_ALTO_GRAMOS,
} from '@/lib/config/gym';
import { formatearPeso } from '@/lib/formato';
import type { TipoEjercicio } from '@/lib/reglas/ejercicio';

export type AccionProgresion = 'subir_peso' | 'subir_reps' | 'mantener' | 'subir_variante' | 'bajar_peso';

export interface Recomendacion {
  accion: AccionProgresion;
  pesoSugeridoGramos: number | null;
  metaRepsSugerida: number;
  mensaje: string;
}

// Doble progresión: la meta se cumple cuando todas las series llegan al tope del rango.
// every() es true con un arreglo vacío: sin series no hay nada que evaluar.
export function alcanzoTope(rango: [number, number], repsPorSerie: number[]): boolean {
  return repsPorSerie.length > 0 && repsPorSerie.every((valor) => valor >= rango[1]);
}

// RN-06: 2,5 kg por defecto; 5 kg cuando la carga ya es alta (salto real de discos y mancuernas).
export function incrementoPeso(pesoActualGramos: number): number {
  return pesoActualGramos >= UMBRAL_PESO_ALTO_GRAMOS ? INCREMENTO_PESO_ALTO_GRAMOS : INCREMENTO_PESO_GRAMOS;
}

// Salto doble solo si se anotó el RIR de todas las series y en todas sobraban al menos 3 repeticiones.
export function sobraronRepeticiones(rirPorSerie: (number | null | undefined)[] | undefined): boolean {
  return (
    rirPorSerie !== undefined &&
    rirPorSerie.length > 0 &&
    rirPorSerie.every((rir) => typeof rir === 'number' && rir >= RIR_SALTO_DOBLE)
  );
}

// Descarga: un 10 % menos, redondeado a 0,5 kg hacia abajo.
export function pesoDeDescarga(pesoActualGramos: number): number {
  return Math.floor((pesoActualGramos * (1 - REDUCCION_DESCARGA)) / 500) * 500;
}

export function recomendarSiguiente(d: {
  tipo: TipoEjercicio;
  rango: [number, number];
  pesoActualGramos: number | null;
  metaRepsActual: number;
  repsPorSerie: number[];
  rirPorSerie?: (number | null)[];
  repsSesionAnterior?: number[];
}): Recomendacion {
  const [min, max] = d.rango;
  const reps = d.repsPorSerie;
  const todasEnTope = alcanzoTope(d.rango, reps);
  const algunaFalla = reps.length === 0 || reps.some((valor) => valor < min);
  const anteriorFallo =
    d.repsSesionAnterior !== undefined &&
    d.repsSesionAnterior.length > 0 &&
    d.repsSesionAnterior.some((valor) => valor < min);

  if (d.tipo === 'calistenia') {
    if (todasEnTope) {
      return {
        accion: 'subir_variante',
        pesoSugeridoGramos: null,
        metaRepsSugerida: min,
        mensaje: `Llegaste a ${max} repeticiones en todas las series. Prueba una variante más difícil y vuelve a ${min} repeticiones.`,
      };
    }
    if (algunaFalla) {
      return {
        accion: 'mantener',
        pesoSugeridoGramos: null,
        metaRepsSugerida: d.metaRepsActual,
        mensaje:
          reps.length > 0 && anteriorFallo
            ? 'Es la segunda sesión seguida bajo el mínimo. Considera una variante más fácil hasta recuperar el rango.'
            : 'No alcanzaste el mínimo en todas las series. Mantén la variante y repite el objetivo.',
      };
    }
    return {
      accion: 'subir_reps',
      pesoSugeridoGramos: null,
      metaRepsSugerida: max,
      mensaje: `Cumpliste el rango. Mantén la variante y apunta a ${max} repeticiones en todas las series la próxima vez.`,
    };
  }

  const pesoActual = d.pesoActualGramos ?? 0;

  if (todasEnTope) {
    const saltoDoble = sobraronRepeticiones(d.rirPorSerie);
    const nuevoPeso = pesoActual + incrementoPeso(pesoActual) * (saltoDoble ? 2 : 1);
    return {
      accion: 'subir_peso',
      pesoSugeridoGramos: nuevoPeso,
      metaRepsSugerida: min,
      mensaje: saltoDoble
        ? `Llegaste a ${max} repeticiones con ${RIR_SALTO_DOBLE} o más en reserva en todas las series. Sube el doble, a ${formatearPeso(nuevoPeso)}, y vuelve a ${min} repeticiones.`
        : `Llegaste a ${max} repeticiones en todas las series. Sube el peso a ${formatearPeso(nuevoPeso)} y vuelve a ${min} repeticiones.`,
    };
  }
  if (algunaFalla && reps.length > 0 && anteriorFallo && pesoActual > 0) {
    const pesoBajo = pesoDeDescarga(pesoActual);
    return {
      accion: 'bajar_peso',
      pesoSugeridoGramos: pesoBajo,
      metaRepsSugerida: min,
      mensaje: `Es la segunda sesión seguida bajo el mínimo. Baja a ${formatearPeso(pesoBajo)} y vuelve a ${min} repeticiones para recuperar el rango.`,
    };
  }
  if (algunaFalla) {
    return {
      accion: 'mantener',
      pesoSugeridoGramos: pesoActual,
      metaRepsSugerida: d.metaRepsActual,
      mensaje: `No alcanzaste el mínimo en todas las series. Mantén ${formatearPeso(pesoActual)} y repite el objetivo.`,
    };
  }
  return {
    accion: 'subir_reps',
    pesoSugeridoGramos: pesoActual,
    metaRepsSugerida: max,
    mensaje: `Cumpliste el rango. Mantén ${formatearPeso(pesoActual)} y apunta a ${max} repeticiones en todas las series la próxima vez.`,
  };
}

// Resumen que la interfaz muestra al cumplir la meta de la doble progresión.
export interface LogroMeta {
  nombre: string;
  tipo: TipoEjercicio;
  rango: [number, number];
  series: { reps: number; pesoGramos: number | null }[];
  volumenGramos: number | null;
  pesoSiguienteGramos: number | null;
  incrementoGramos: number | null;
  metaRepsSiguiente: number;
  saltoDoble: boolean;
}

// Se llama después de guardar: la recomendación y el peso de referencia ya reflejan la sesión nueva.
export function detectarLogro(d: {
  nombre: string;
  tipo: TipoEjercicio;
  rango: [number, number];
  pesoRefGramos: number | null;
  series: { reps: number; pesoGramos?: number | null; rir?: number | null }[];
  recomendacion: Recomendacion;
}): LogroMeta | null {
  const subio = d.recomendacion.accion === 'subir_peso' || d.recomendacion.accion === 'subir_variante';

  if (!subio || !alcanzoTope(d.rango, d.series.map((serie) => serie.reps))) {
    return null;
  }

  const series = d.series.map((serie) => ({ reps: serie.reps, pesoGramos: serie.pesoGramos ?? null }));
  const esPeso = d.tipo === 'peso';
  const pesoSiguiente = esPeso ? d.recomendacion.pesoSugeridoGramos : null;

  return {
    nombre: d.nombre,
    tipo: d.tipo,
    rango: d.rango,
    series,
    volumenGramos: esPeso
      ? series.reduce((total, serie) => total + serie.reps * (serie.pesoGramos ?? 0), 0)
      : null,
    pesoSiguienteGramos: pesoSiguiente,
    incrementoGramos: pesoSiguiente === null ? null : pesoSiguiente - (d.pesoRefGramos ?? 0),
    metaRepsSiguiente: d.recomendacion.metaRepsSugerida,
    saltoDoble: esPeso && sobraronRepeticiones(d.series.map((serie) => serie.rir ?? null)),
  };
}

// Sección 8.1: el estado del ejercicio cambia solo cuando la sesión aplica la recomendación.
// En peso se aplica si todas las series usan el peso sugerido. En calistenia no hay peso con qué
// comprobarlo, así que registrar la sesión ya la aplica.
export function estadoTrasSesion(d: {
  tipo: TipoEjercicio;
  pesoActualGramos: number | null;
  metaRepsActual: number;
  recomendacion: Recomendacion;
  pesosDeLaSesion: (number | null)[];
}): { pesoRefGramos: number | null; metaReps: number } {
  const { recomendacion } = d;

  if (d.tipo === 'calistenia') {
    return { pesoRefGramos: null, metaReps: recomendacion.metaRepsSugerida };
  }

  const aplicada = d.pesosDeLaSesion.every((peso) => peso === recomendacion.pesoSugeridoGramos);

  return aplicada
    ? { pesoRefGramos: recomendacion.pesoSugeridoGramos, metaReps: recomendacion.metaRepsSugerida }
    : { pesoRefGramos: d.pesoActualGramos, metaReps: d.metaRepsActual };
}
