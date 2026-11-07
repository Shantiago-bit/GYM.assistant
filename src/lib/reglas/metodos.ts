import type { TipoEjercicio } from '@/lib/reglas/ejercicio';

// Métodos de series. El peso de referencia del ejercicio es siempre el de la serie más pesada;
// el plan deriva de él el peso de las demás.
export type Metodo =
  | 'rectas'
  | 'principal_descarga'
  | 'piramide_invertida'
  | 'piramide_ascendente'
  | 'cluster';

export const METODOS: { valor: Metodo; texto: string; descripcion: string; soloPeso: boolean }[] = [
  {
    valor: 'rectas',
    texto: 'Series rectas',
    descripcion: 'Mismo peso y mismas repeticiones en todas las series.',
    soloPeso: false,
  },
  {
    valor: 'principal_descarga',
    texto: 'Principal + descarga',
    descripcion: 'Una serie pesada y el resto un 10 % más ligeras.',
    soloPeso: true,
  },
  {
    valor: 'piramide_invertida',
    texto: 'Pirámide invertida',
    descripcion: 'La más pesada primero; cada serie siguiente −10 % y +2 reps.',
    soloPeso: true,
  },
  {
    valor: 'piramide_ascendente',
    texto: 'Pirámide ascendente',
    descripcion: 'Sube un 10 % por serie hasta la más pesada al final.',
    soloPeso: true,
  },
  {
    valor: 'cluster',
    texto: 'Cluster',
    descripcion: 'Cada serie en bloques de 1–2 reps con 15–30 s de pausa.',
    soloPeso: false,
  },
];

export function metodosPara(tipo: TipoEjercicio) {
  return METODOS.filter((metodo) => tipo === 'peso' || !metodo.soloPeso);
}

export function textoMetodo(metodo: Metodo): string {
  return METODOS.find((opcion) => opcion.valor === metodo)?.texto ?? metodo;
}

export function metodoValido(tipo: TipoEjercicio, metodo: Metodo): boolean {
  return metodosPara(tipo).some((opcion) => opcion.valor === metodo);
}

const REDUCCION_POR_SERIE = 0.1;
const REPS_EXTRA_PIRAMIDE = 2;

// Peso reducido en una fracción, redondeado a 0,5 kg hacia abajo.
export function reducirPeso(pesoGramos: number, fraccion: number): number {
  return Math.max(0, Math.floor((pesoGramos * (1 - fraccion)) / 500) * 500);
}

// Índices de las series que deciden la progresión.
export function indicesClave(metodo: Metodo, cantidad: number): number[] {
  if (cantidad === 0) return [];
  switch (metodo) {
    case 'principal_descarga':
    case 'piramide_invertida':
      return [0];
    case 'piramide_ascendente':
      return [cantidad - 1];
    case 'rectas':
    case 'cluster':
      return Array.from({ length: cantidad }, (_, indice) => indice);
  }
}

export function seriesClave<T>(metodo: Metodo, series: T[]): T[] {
  return indicesClave(metodo, series.length).map((indice) => series[indice]!);
}

export interface PlanSerie {
  etiqueta: string;
  pesoGramos: number | null;
  repsMin: number;
  repsMax: number;
  clave: boolean;
}

// Plan de la próxima sesión: peso y repeticiones objetivo de cada serie.
export function planDeSesion(d: {
  metodo: Metodo;
  tipo: TipoEjercicio;
  rango: [number, number];
  metaReps: number;
  pesoGramos: number | null;
  cantidad: number;
}): PlanSerie[] {
  const [min, max] = d.rango;
  const cantidad = Math.max(1, d.cantidad);
  const peso = d.tipo === 'peso' ? (d.pesoGramos ?? 0) : null;
  const conPeso = (fraccion: number) => (peso === null ? null : reducirPeso(peso, fraccion));
  const clave = new Set(indicesClave(d.metodo, cantidad));
  const meta = Math.min(Math.max(d.metaReps, min), max);

  return Array.from({ length: cantidad }, (_, indice): PlanSerie => {
    const esClave = clave.has(indice);

    switch (d.metodo) {
      case 'principal_descarga':
        return indice === 0
          ? { etiqueta: 'Principal', pesoGramos: peso, repsMin: min, repsMax: meta, clave: true }
          : { etiqueta: 'Descarga', pesoGramos: conPeso(REDUCCION_POR_SERIE), repsMin: min, repsMax: max, clave: false };
      case 'piramide_invertida': {
        const extra = indice * REPS_EXTRA_PIRAMIDE;
        return {
          etiqueta: indice === 0 ? 'Más pesada' : `−${indice * 10} %`,
          pesoGramos: conPeso(indice * REDUCCION_POR_SERIE),
          repsMin: min + extra,
          repsMax: (indice === 0 ? meta : max) + extra,
          clave: esClave,
        };
      }
      case 'piramide_ascendente': {
        const pasosHastaLaCima = cantidad - 1 - indice;
        return pasosHastaLaCima === 0
          ? { etiqueta: 'Más pesada', pesoGramos: peso, repsMin: min, repsMax: meta, clave: true }
          : {
              etiqueta: 'Subida',
              pesoGramos: conPeso(pasosHastaLaCima * REDUCCION_POR_SERIE),
              repsMin: min,
              repsMax: min,
              clave: false,
            };
      }
      case 'cluster':
        return { etiqueta: 'Cluster', pesoGramos: peso, repsMin: min, repsMax: meta, clave: true };
      case 'rectas':
        return { etiqueta: '', pesoGramos: peso, repsMin: min, repsMax: meta, clave: true };
    }
  });
}
