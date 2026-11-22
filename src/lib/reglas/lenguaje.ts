// "Escríbelo rápido": convierte lo que la persona escribe o dicta ("3x10 40", "60 kg: 10, 8, 7", "8 7 6 rir 2")
// en series. Es puro: no guarda nada; la interfaz muestra una vista previa y la persona confirma.
import { formatearPeso } from '@/lib/formato';
import type { TipoEjercicio } from '@/lib/reglas/ejercicio';
import type { Metodo } from '@/lib/reglas/metodos';

// Mismos topes que src/lib/validacion/esquemas.ts (columnas SMALLINT e INTEGER).
export const REPS_MAXIMAS = 1000;
export const PESO_MAXIMO_KG = 2000;
export const RIR_MAXIMO = 10;
export const SERIES_MAXIMAS = 20;

export type TecnicaInterpretada = 'normal' | 'aproximacion';

export interface SerieInterpretada {
  reps: number;
  pesoGramos: number | null;
  rir: number | null;
  tecnica: TecnicaInterpretada;
}

export type ResultadoInterpretacion =
  | { ok: true; series: SerieInterpretada[]; avisos: string[] }
  | { ok: false; error: string };

export interface ContextoInterpretacion {
  tipo: TipoEjercicio;
  pesoActualGramos: number | null;
  metodo?: Metodo | undefined;
}

export const EJEMPLOS_INTERPRETE = ['3x10 40', '60 kg: 10, 8, 7', '10, 8, 6 con 50 rir 2'] as const;

const fallo = (error: string): ResultadoInterpretacion => ({ ok: false, error });
const noEntendi = (texto: string) =>
  fallo(`No entendí "${texto.trim().slice(0, 60)}". Prueba así: ${EJEMPLOS_INTERPRETE.join(' · ')}.`);

// Minúsculas, sin tildes, "×" como "x" y "kilos" como "kg".
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[×*]/g, 'x')
    .replace(/\b(kilogramos?|kilos?|kgs)\b/g, 'kg')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

const NUM = String.raw`\d+(?:[.,]\d+)?`;
const LISTA = String.raw`\d+(?:\s*(?:,|y|-|\/|\s)\s*\d+)*`;
const REPS = String.raw`(?:\s*(?:reps?|repeticiones?))?`;
const CONECTOR = String.raw`(?:\s*(?:con|a|@|de|en))?`;

// "3x10 40", "3 x 10 con 40", "3 de 10 con 40 kg", "4x8 a 60", "3 series de 10".
const SERIES_POR_REPS = new RegExp(
  String.raw`^(\d+)\s*(?:series?\s*)?(?:x|de)\s*(\d+)${REPS}(?:${CONECTOR}\s*(${NUM})\s*(?:kg)?)?$`,
);
// "60 kg: 10, 8, 7" o "60 kg 10 8 7".
const PESO_Y_LISTA = new RegExp(String.raw`^(${NUM})\s*kg\s*:?\s*(${LISTA})${REPS}$`);
// "10, 8, 6 con 50" o "10 8 6 a 62,5 kg".
const LISTA_Y_PESO = new RegExp(String.raw`^(${LISTA})${REPS}\s*(?:con|a|@)\s*(${NUM})\s*(?:kg)?$`);
// "8 7 6" o "10, 8, 6".
const SOLO_LISTA = new RegExp(String.raw`^(${LISTA})${REPS}$`);

const leerNumero = (texto: string) => Number(texto.replace(',', '.'));
const leerLista = (texto: string) => texto.split(/\s*(?:,|y|-|\/|\s)\s*/).filter(Boolean).map(Number);

interface Tramo {
  reps: number[];
  pesoKg: number | null;
  calentamiento: boolean;
}

function leerTramo(texto: string): Tramo | null {
  let resto = texto.trim().replace(/^[,.:]+|[,.:]+$/g, '').trim();
  const calentamiento = /^(calentamiento|aproximacion|calentar)\b/.test(resto);
  if (calentamiento) resto = resto.replace(/^(calentamiento|aproximacion|calentar)\s*:?\s*/, '');
  if (!resto) return null;

  let coincide = SERIES_POR_REPS.exec(resto);
  if (coincide) {
    const series = Number(coincide[1]);
    const reps = Number(coincide[2]);
    return { reps: Array.from({ length: series }, () => reps), pesoKg: coincide[3] ? leerNumero(coincide[3]) : null, calentamiento };
  }
  coincide = PESO_Y_LISTA.exec(resto);
  if (coincide) return { reps: leerLista(coincide[2]!), pesoKg: leerNumero(coincide[1]!), calentamiento };
  coincide = LISTA_Y_PESO.exec(resto);
  if (coincide) return { reps: leerLista(coincide[1]!), pesoKg: leerNumero(coincide[2]!), calentamiento };
  coincide = SOLO_LISTA.exec(resto);
  if (coincide) return { reps: leerLista(coincide[1]!), pesoKg: null, calentamiento };
  return null;
}

// Separa los tramos: ";", salto de línea, y antes de "calentamiento" o de un "NxM" que empieza otro grupo.
function tramos(texto: string): string[] {
  return texto
    .split(
      /;|\n|,?\s+y\s+(?=calentamiento|aproximacion|\d+\s*(?:x|series de)\s*\d)|,?\s*(?=\b(?:calentamiento|aproximacion)\b)|(?<!calentamiento|aproximacion|calentamiento:|aproximacion:),?\s+(?=\d+\s*(?:x|series de)\s*\d)/,
    )
    .map((parte) => parte.trim())
    .filter(Boolean);
}

export function interpretarSeries(texto: string, contexto: ContextoInterpretacion): ResultadoInterpretacion {
  if (/\b(lb|lbs|libras?|pounds?)\b/i.test(texto)) {
    return fallo('Escribe el peso en kilos (kg): la app guarda el peso en kg. Por ejemplo: 3x10 40.');
  }
  let limpio = normalizar(texto);
  if (!limpio) return fallo(`Escribe tus series, por ejemplo: ${EJEMPLOS_INTERPRETE.join(' · ')}.`);

  // Opciones que valen para todo el texto: "rir 2" y "al fallo" / "la última al fallo".
  let rirGeneral: number | null = null;
  const rir = /\b(?:con\s+)?rir\s*:?\s*(\d+)\b/.exec(limpio);
  if (rir) {
    rirGeneral = Number(rir[1]);
    limpio = limpio.replace(rir[0], ' ');
  }
  const alFallo = /\b(?:(?:la\s+)?ultima\s+)?(?:serie\s+)?al\s+fallo\b/.test(limpio);
  limpio = limpio
    .replace(/\b(?:(?:la\s+)?ultima\s+)?(?:serie\s+)?al\s+fallo\b/, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
  limpio = limpio.replace(/^(hice|hoy hice|hoy)\s+/, '');

  const leidos: Tramo[] = [];
  for (const parte of tramos(limpio)) {
    // Restos de las opciones quitadas: un ":" o un "y" sueltos.
    if (/^[\s,.:y]*$/.test(parte)) continue;
    const tramo = leerTramo(parte.replace(/[\s,]+y$/, ''));
    if (!tramo) return noEntendi(parte);
    leidos.push(tramo);
  }
  if (leidos.length === 0) return noEntendi(texto);

  const avisos: string[] = [];
  const esPeso = contexto.tipo === 'peso';
  const series: SerieInterpretada[] = [];
  let usoPesoActual = false;
  let ignoroPeso = false;

  for (const tramo of leidos) {
    if (tramo.pesoKg !== null && (!Number.isFinite(tramo.pesoKg) || tramo.pesoKg < 0 || tramo.pesoKg > PESO_MAXIMO_KG)) {
      return fallo(`El peso debe estar entre 0 y ${PESO_MAXIMO_KG} kg.`);
    }
    let pesoGramos: number | null = null;
    if (esPeso) {
      if (tramo.pesoKg !== null) pesoGramos = Math.round(tramo.pesoKg * 1000);
      else if (contexto.pesoActualGramos !== null && contexto.pesoActualGramos > 0) {
        pesoGramos = contexto.pesoActualGramos;
        usoPesoActual = true;
      } else {
        return fallo('Escribe también el peso, por ejemplo: 3x10 40.');
      }
    } else if (tramo.pesoKg !== null) {
      ignoroPeso = true;
    }
    for (const reps of tramo.reps) {
      if (!Number.isInteger(reps) || reps < 1 || reps > REPS_MAXIMAS) {
        return fallo(`Las repeticiones de cada serie deben estar entre 1 y ${REPS_MAXIMAS}.`);
      }
      series.push({ reps, pesoGramos, rir: null, tecnica: tramo.calentamiento ? 'aproximacion' : 'normal' });
    }
  }

  if (series.length > SERIES_MAXIMAS) return fallo(`Son demasiadas series: escribe hasta ${SERIES_MAXIMAS}.`);
  if (rirGeneral !== null && rirGeneral > RIR_MAXIMO) return fallo(`El RIR debe estar entre 0 y ${RIR_MAXIMO}.`);

  const trabajo = series.filter((serie) => serie.tecnica === 'normal');
  if (trabajo.length === 0) return fallo('Solo escribiste calentamiento: agrega tus series de trabajo, por ejemplo 3x10 40.');
  if (rirGeneral !== null) for (const serie of trabajo) serie.rir = rirGeneral;
  if (alFallo) trabajo.at(-1)!.rir = 0;

  if (usoPesoActual) avisos.push(`Usé tu peso actual (${formatearPeso(contexto.pesoActualGramos!)}) porque no escribiste el peso.`);
  if (ignoroPeso) avisos.push('Con tu cuerpo no se anota peso: lo dejé fuera.');
  return { ok: true, series, avisos };
}

// "3 × 10 con 40 kg", para la vista previa (chips).
export function textoSerieInterpretada(serie: SerieInterpretada): string {
  const peso = serie.pesoGramos === null ? '' : ` × ${formatearPeso(serie.pesoGramos)}`;
  const rir = serie.rir === null ? '' : ` · RIR ${serie.rir}`;
  const calentamiento = serie.tecnica === 'aproximacion' ? 'Calentamiento: ' : '';
  return `${calentamiento}${serie.reps} reps${peso}${rir}`;
}
