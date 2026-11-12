import { DIAS_ENTRENAMIENTO_POR_DEFECTO, RACHA_CUENTA_DIAS_EXTRA, RACHA_DIAS_EXTRA_DESDE } from '@/lib/config/gym';
import { restarDias } from '@/lib/reglas/fechas';

// Racha según los días de entrenamiento que eligió la persona. Días de la semana ISO: 1 = lunes … 7 = domingo.
// Fechas AAAA-MM-DD en la zona horaria de la app.

export const NOMBRES_DIA: Record<number, string> = {
  1: 'lunes',
  2: 'martes',
  3: 'miércoles',
  4: 'jueves',
  5: 'viernes',
  6: 'sábado',
  7: 'domingo',
};
export const LETRAS_DIA: Record<number, string> = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 7: 'D' };

// Cada cambio de días es un tramo vigente desde una fecha: cambiar los días no reescribe las rachas pasadas.
export interface TramoDias {
  dias: number[];
  vigenteDesde: string;
}

export interface Racha {
  actual: number;
  mejor: number;
  hoyEsDescanso: boolean;
  proximoDiaPlanificado: string | null; // la próxima fecha planificada después de hoy
}

export interface OpcionesRacha {
  contarExtras?: boolean;
  // Los días extra cuentan desde esta fecha: así las rachas que ya existían no cambian al activar la regla.
  extrasDesde?: string;
}

export function diaSemana(fecha: string): number {
  const dia = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return dia === 0 ? 7 : dia;
}

// Ordena y quita repetidos (y lo que no sea un día de 1 a 7).
export function normalizarDias(dias: number[]): number[] {
  return [...new Set(dias)].filter((dia) => Number.isInteger(dia) && dia >= 1 && dia <= 7).sort((a, b) => a - b);
}

export function diasValidos(dias: number[]): boolean {
  return (
    dias.length >= 1 &&
    dias.length <= 7 &&
    new Set(dias).size === dias.length &&
    dias.every((dia) => Number.isInteger(dia) && dia >= 1 && dia <= 7)
  );
}

// Días vigentes en una fecha. Antes del primer tramo valen los días del primer tramo (las sesiones previas a
// elegir los días se evalúan con esos días); sin historial, lunes a sábado.
export function diasEnFecha(historial: TramoDias[], fecha: string): number[] {
  if (historial.length === 0) return DIAS_ENTRENAMIENTO_POR_DEFECTO;
  const ordenado = [...historial].sort((a, b) => a.vigenteDesde.localeCompare(b.vigenteDesde));
  let dias = ordenado[0]!.dias;
  for (const tramo of ordenado) {
    if (tramo.vigenteDesde <= fecha) dias = tramo.dias;
  }
  return dias;
}

export function esDiaPlanificado(fecha: string, historial: TramoDias[]): boolean {
  return diasEnFecha(historial, fecha).includes(diaSemana(fecha));
}

// "L · X · V"
export function textoDias(dias: number[]): string {
  return normalizarDias(dias)
    .map((dia) => LETRAS_DIA[dia])
    .join(' · ');
}

// "lunes, miércoles y viernes"
export function listaDias(dias: number[]): string {
  const nombres = normalizarDias(dias).map((dia) => NOMBRES_DIA[dia]!);
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
}

// Racha actual (hacia atrás desde hoy) y mejor racha (sobre todo el historial):
// - Un día planificado con sesión suma 1; sin sesión la rompe, salvo hoy (la racha sigue viva hasta que termine).
// - Un día de descanso no la rompe; con sesión suma 1 como día extra (si contarExtras), pero no reemplaza un
//   día planificado perdido.
export function calcularRacha(
  fechasConSesion: string[],
  hoy: string,
  historial: TramoDias[] = [],
  opciones: OpcionesRacha = {},
): Racha {
  const contarExtras = opciones.contarExtras ?? RACHA_CUENTA_DIAS_EXTRA;
  const extrasDesde = opciones.extrasDesde ?? RACHA_DIAS_EXTRA_DESDE;
  const cuentaExtra = (fecha: string) => contarExtras && fecha >= extrasDesde;
  const planificado = (fecha: string) => esDiaPlanificado(fecha, historial);

  const entreno = new Set(fechasConSesion.filter((fecha) => fecha <= hoy));
  const primera = [...entreno].sort()[0];

  let actual = 0;
  for (let dia = hoy; primera !== undefined && dia >= primera; dia = restarDias(dia, 1)) {
    if (planificado(dia)) {
      if (entreno.has(dia)) actual += 1;
      else if (dia !== hoy) break;
    } else if (entreno.has(dia) && cuentaExtra(dia)) {
      actual += 1;
    }
  }

  let mejor = 0;
  let seguidos = 0;
  for (let dia = primera; dia !== undefined && dia <= hoy; dia = restarDias(dia, -1)) {
    if (planificado(dia)) {
      if (entreno.has(dia)) seguidos += 1;
      else if (dia !== hoy) seguidos = 0;
    } else if (entreno.has(dia) && cuentaExtra(dia)) {
      seguidos += 1;
    }
    mejor = Math.max(mejor, seguidos);
  }

  let proximoDiaPlanificado: string | null = null;
  for (let paso = 1; paso <= 7 && proximoDiaPlanificado === null; paso++) {
    const fecha = restarDias(hoy, -paso);
    if (planificado(fecha)) proximoDiaPlanificado = fecha;
  }

  return { actual, mejor: Math.max(mejor, actual), hoyEsDescanso: !planificado(hoy), proximoDiaPlanificado };
}
