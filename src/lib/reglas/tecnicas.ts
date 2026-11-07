// Técnicas por serie. La meta de la doble progresión se mide siempre con las repeticiones de la serie
// principal (la de activación en myo-reps); las mini series suman volumen, no cuentan para el rango.

export type TipoSerie = 'normal' | 'aproximacion' | 'amrap' | 'rest_pause' | 'myo_reps' | 'drop_set';

export interface Extra {
  reps: number;
  pesoGramos?: number | null;
}

export const TIPOS_SERIE: {
  valor: TipoSerie;
  texto: string;
  descripcion: string;
  admiteExtras: boolean;
}[] = [
  { valor: 'normal', texto: 'Normal', descripcion: 'Serie de trabajo.', admiteExtras: false },
  {
    valor: 'aproximacion',
    texto: 'Aproximación',
    descripcion: 'Calentamiento: no cuenta para la progresión, el 1RM ni el volumen.',
    admiteExtras: false,
  },
  {
    valor: 'amrap',
    texto: 'AMRAP',
    descripcion: 'Tantas repeticiones como puedas. Si no anotas RIR se asume el fallo.',
    admiteExtras: false,
  },
  {
    valor: 'rest_pause',
    texto: 'Rest-pause',
    descripcion: 'Cerca del fallo, 10–20 s de pausa y 1–3 reps más, una o dos veces.',
    admiteExtras: true,
  },
  {
    valor: 'myo_reps',
    texto: 'Myo-reps',
    descripcion: 'Activación de 12–20 reps y mini series de 3–5 con 3–5 respiraciones de pausa.',
    admiteExtras: true,
  },
  {
    valor: 'drop_set',
    texto: 'Drop set',
    descripcion: 'Al llegar al fallo, baja el peso un 20–30 % y sigue sin descansar.',
    admiteExtras: true,
  },
];

export const MAX_EXTRAS = 6;

export function textoTipoSerie(tipo: TipoSerie): string {
  return TIPOS_SERIE.find((opcion) => opcion.valor === tipo)?.texto ?? tipo;
}

export function admiteExtras(tipo: TipoSerie): boolean {
  return TIPOS_SERIE.find((opcion) => opcion.valor === tipo)?.admiteExtras ?? false;
}

export function esEfectiva(serie: { tipoSerie?: TipoSerie | null | undefined }): boolean {
  return (serie.tipoSerie ?? 'normal') !== 'aproximacion';
}

export function seriesEfectivas<T extends { tipoSerie?: TipoSerie | null | undefined }>(series: T[]): T[] {
  return series.filter(esEfectiva);
}

// Volumen (peso × reps) de una serie con sus mini series. En rest-pause y myo-reps las mini series
// usan el peso de la serie; en drop set, el suyo.
export function volumenSerie(serie: {
  reps: number;
  pesoGramos?: number | null | undefined;
  extras?: Extra[] | null | undefined;
}): number {
  const peso = serie.pesoGramos ?? 0;
  const extras = serie.extras ?? [];
  return serie.reps * peso + extras.reduce((total, extra) => total + extra.reps * (extra.pesoGramos ?? peso), 0);
}

export function repsTotales(serie: { reps: number; extras?: Extra[] | null | undefined }): number {
  return serie.reps + (serie.extras ?? []).reduce((total, extra) => total + extra.reps, 0);
}

// Listas del formulario: "3 2 2" o "3+2+2" → [3, 2, 2]. En pesos la coma es decimal ("40,5 30");
// en repeticiones también separa ("3, 2, 2"). Devuelve null si el texto no es válido.
export function leerListaNumeros(texto: string, decimales: boolean): number[] | null {
  const separador = decimales ? /[;+\s]+/ : /[,;+\s]+/;
  const partes = texto
    .split(separador)
    .map((parte) => parte.trim().replace(',', '.'))
    .filter((parte) => parte !== '');
  const numeros = partes.map(Number);

  if (numeros.some((numero) => !Number.isFinite(numero) || numero < 0 || (!decimales && !Number.isInteger(numero)))) {
    return null;
  }
  return numeros;
}
