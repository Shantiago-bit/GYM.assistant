import {
  INCREMENTO_PESO_ALTO_GRAMOS,
  INCREMENTO_PESO_GRAMOS,
  REDUCCION_DESCARGA,
  RIR_SALTO_DOBLE,
  UMBRAL_PESO_ALTO_GRAMOS,
} from '@/lib/config/gym';
import { formatearPeso } from '@/lib/formato';
import type { TipoEjercicio } from '@/lib/reglas/ejercicio';
import { indicesClave, reducirPeso, seriesClave, type Metodo } from '@/lib/reglas/metodos';
import { seriesEfectivas, volumenSerie, type Extra, type TipoSerie } from '@/lib/reglas/tecnicas';

export type AccionProgresion = 'subir_peso' | 'subir_reps' | 'mantener' | 'subir_variante' | 'bajar_peso';

export interface Recomendacion {
  accion: AccionProgresion;
  pesoSugeridoGramos: number | null;
  metaRepsSugerida: number;
  mensaje: string;
}

// Doble progresión: la meta se cumple cuando todas las series evaluadas llegan al tope del rango.
// every() es true con un arreglo vacío: sin series no hay nada que evaluar.
export function alcanzoTope(rango: [number, number], repsPorSerie: number[]): boolean {
  return repsPorSerie.length > 0 && repsPorSerie.every((valor) => valor >= rango[1]);
}

// RN-06: 2,5 kg por defecto; 5 kg cuando la carga ya es alta (salto real de discos y mancuernas).
export function incrementoPeso(pesoActualGramos: number): number {
  return pesoActualGramos >= UMBRAL_PESO_ALTO_GRAMOS ? INCREMENTO_PESO_ALTO_GRAMOS : INCREMENTO_PESO_GRAMOS;
}

// Salto doble solo si se anotó el RIR de todas las series evaluadas y en todas sobraban al menos 3.
export function sobraronRepeticiones(rirPorSerie: (number | null | undefined)[] | undefined): boolean {
  return (
    rirPorSerie !== undefined &&
    rirPorSerie.length > 0 &&
    rirPorSerie.every((rir) => typeof rir === 'number' && rir >= RIR_SALTO_DOBLE)
  );
}

// Descarga: un 10 % menos, redondeado a 0,5 kg hacia abajo.
export function pesoDeDescarga(pesoActualGramos: number): number {
  return reducirPeso(pesoActualGramos, REDUCCION_DESCARGA);
}

// Con una sola serie clave, los mensajes hablan de ella y no de "todas las series".
function dondeSeEvalua(metodo: Metodo): string {
  switch (metodo) {
    case 'principal_descarga':
      return 'en la serie principal';
    case 'piramide_invertida':
    case 'piramide_ascendente':
      return 'en la serie más pesada';
    case 'rectas':
    case 'cluster':
      return 'en todas las series';
  }
}

export function recomendarSiguiente(d: {
  tipo: TipoEjercicio;
  rango: [number, number];
  pesoActualGramos: number | null;
  metaRepsActual: number;
  repsPorSerie: number[];
  rirPorSerie?: (number | null)[];
  repsSesionAnterior?: number[];
  metodo?: Metodo;
  // Peso usado en cada serie de la última sesión, en el mismo orden que repsPorSerie.
  pesosPorSerie?: (number | null)[];
}): Recomendacion {
  const metodo = d.metodo ?? 'rectas';
  const [min, max] = d.rango;
  const reps = seriesClave(metodo, d.repsPorSerie);
  const rir = d.rirPorSerie === undefined ? undefined : seriesClave(metodo, d.rirPorSerie);
  const anterior = d.repsSesionAnterior === undefined ? [] : seriesClave(metodo, d.repsSesionAnterior);
  const donde = dondeSeEvalua(metodo);

  // Una serie clave solo cumple la meta si se hizo con el peso de referencia o más: llegar al tope
  // con menos peso (o con una serie de descarga, si se cambió de método) no justifica subir.
  const pesosClave = d.pesosPorSerie === undefined ? [] : seriesClave(metodo, d.pesosPorSerie);
  const conPesoCompleto =
    d.tipo !== 'peso' || pesosClave.every((peso) => (peso ?? 0) >= (d.pesoActualGramos ?? 0));

  const todasEnTope = alcanzoTope(d.rango, reps) && conPesoCompleto;
  const algunaFalla = reps.length === 0 || reps.some((valor) => valor < min);
  const anteriorFallo = anterior.length > 0 && anterior.some((valor) => valor < min);

  if (d.tipo === 'calistenia') {
    if (todasEnTope) {
      return {
        accion: 'subir_variante',
        pesoSugeridoGramos: null,
        metaRepsSugerida: min,
        mensaje: `Llegaste a ${max} repeticiones ${donde}. Prueba una variante más difícil y vuelve a ${min} repeticiones.`,
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
            : `No alcanzaste el mínimo ${donde}. Mantén la variante y repite el objetivo.`,
      };
    }
    return {
      accion: 'subir_reps',
      pesoSugeridoGramos: null,
      metaRepsSugerida: max,
      mensaje: `Cumpliste el rango. Mantén la variante y apunta a ${max} repeticiones ${donde} la próxima vez.`,
    };
  }

  const pesoActual = d.pesoActualGramos ?? 0;

  if (todasEnTope) {
    const saltoDoble = sobraronRepeticiones(rir);
    const nuevoPeso = pesoActual + incrementoPeso(pesoActual) * (saltoDoble ? 2 : 1);
    return {
      accion: 'subir_peso',
      pesoSugeridoGramos: nuevoPeso,
      metaRepsSugerida: min,
      mensaje: saltoDoble
        ? `Llegaste a ${max} repeticiones con ${RIR_SALTO_DOBLE} o más en reserva ${donde}. Sube el doble, a ${formatearPeso(nuevoPeso)}, y vuelve a ${min} repeticiones.`
        : `Llegaste a ${max} repeticiones ${donde}. Sube el peso a ${formatearPeso(nuevoPeso)} y vuelve a ${min} repeticiones.`,
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
      mensaje: `No alcanzaste el mínimo ${donde}. Mantén ${formatearPeso(pesoActual)} y repite el objetivo.`,
    };
  }
  return {
    accion: 'subir_reps',
    pesoSugeridoGramos: pesoActual,
    metaRepsSugerida: max,
    mensaje: `Cumpliste el rango. Mantén ${formatearPeso(pesoActual)} y apunta a ${max} repeticiones ${donde} la próxima vez.`,
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
  metodo: Metodo;
}

// Se llama después de guardar: la recomendación y el peso de referencia ya reflejan la sesión nueva.
export function detectarLogro(d: {
  nombre: string;
  tipo: TipoEjercicio;
  rango: [number, number];
  pesoRefGramos: number | null;
  series: {
    reps: number;
    pesoGramos?: number | null;
    rir?: number | null;
    tipoSerie?: TipoSerie | null;
    extras?: Extra[] | null;
  }[];
  recomendacion: Recomendacion;
  metodo?: Metodo;
}): LogroMeta | null {
  const metodo = d.metodo ?? 'rectas';
  const subio = d.recomendacion.accion === 'subir_peso' || d.recomendacion.accion === 'subir_variante';
  const efectivas = seriesEfectivas(d.series);
  const clave = seriesClave(metodo, efectivas);

  if (!subio || !alcanzoTope(d.rango, clave.map((serie) => serie.reps))) {
    return null;
  }

  const series = efectivas.map((serie) => ({ reps: serie.reps, pesoGramos: serie.pesoGramos ?? null }));
  const esPeso = d.tipo === 'peso';
  const pesoSiguiente = esPeso ? d.recomendacion.pesoSugeridoGramos : null;

  return {
    nombre: d.nombre,
    tipo: d.tipo,
    rango: d.rango,
    series,
    // Incluye las mini series (rest-pause, myo-reps, drop set); excluye la aproximación.
    volumenGramos: esPeso ? efectivas.reduce((total, serie) => total + volumenSerie(serie), 0) : null,
    pesoSiguienteGramos: pesoSiguiente,
    incrementoGramos: pesoSiguiente === null ? null : pesoSiguiente - (d.pesoRefGramos ?? 0),
    metaRepsSiguiente: d.recomendacion.metaRepsSugerida,
    saltoDoble: esPeso && sobraronRepeticiones(clave.map((serie) => serie.rir ?? null)),
    metodo,
  };
}

// "Listo para subir" en el listado: la última sesión (sin aproximaciones) cumple la meta del método.
export function listoParaSubir(d: {
  tipo: TipoEjercicio;
  metodo: Metodo;
  rango: [number, number];
  pesoRefGramos: number | null;
  series: { reps: number; pesoGramos: number | null; tipoSerie?: TipoSerie | null }[];
}): boolean {
  const efectivas = seriesEfectivas(d.series);
  const { accion } = recomendarSiguiente({
    tipo: d.tipo,
    rango: d.rango,
    pesoActualGramos: d.pesoRefGramos,
    metaRepsActual: d.rango[1],
    repsPorSerie: efectivas.map((serie) => serie.reps),
    pesosPorSerie: efectivas.map((serie) => serie.pesoGramos),
    metodo: d.metodo,
  });
  return accion === 'subir_peso' || accion === 'subir_variante';
}

// Sección 8.1: el estado del ejercicio cambia solo cuando la sesión aplica la recomendación.
// En peso se aplica si las series clave usan el peso sugerido (las demás siguen el plan del método).
// En calistenia no hay peso con qué comprobarlo, así que registrar la sesión ya la aplica.
export function estadoTrasSesion(d: {
  tipo: TipoEjercicio;
  pesoActualGramos: number | null;
  metaRepsActual: number;
  recomendacion: Recomendacion;
  pesosDeLaSesion: (number | null)[];
  metodo?: Metodo;
}): { pesoRefGramos: number | null; metaReps: number } {
  const { recomendacion } = d;

  if (d.tipo === 'calistenia') {
    return { pesoRefGramos: null, metaReps: recomendacion.metaRepsSugerida };
  }

  const indices = indicesClave(d.metodo ?? 'rectas', d.pesosDeLaSesion.length);
  const aplicada =
    indices.length > 0 &&
    indices.every((indice) => d.pesosDeLaSesion[indice] === recomendacion.pesoSugeridoGramos);

  return aplicada
    ? { pesoRefGramos: recomendacion.pesoSugeridoGramos, metaReps: recomendacion.metaRepsSugerida }
    : { pesoRefGramos: d.pesoActualGramos, metaReps: d.metaRepsActual };
}
