// Reglas puras del perfil: edad, cumpleaños, racha, récords, favorito y totales.
// Las fechas son textos AAAA-MM-DD; "hoy" se calcula fuera, en la zona horaria de la app (hoyBogota).
import { DIAS_PR_NUEVO } from '@/lib/config/gym';
import { restarDias } from '@/lib/reglas/fechas';
import { estimar1RM } from '@/lib/reglas/fuerza';
import { esEfectiva, volumenSerie, type Extra, type TipoSerie } from '@/lib/reglas/tecnicas';

export function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

const partes = (fecha: string) => fecha.split('-').map(Number) as [number, number, number];

// Mes y día en que se celebra el cumpleaños ese año: quien nació un 29 de febrero lo celebra el 28 si no es bisiesto.
function diaDeCumpleanos(fechaNacimiento: string, anio: number): string {
  const [, mes, dia] = partes(fechaNacimiento);
  const diaReal = mes === 2 && dia === 29 && !esBisiesto(anio) ? 28 : dia;
  return `${String(mes).padStart(2, '0')}-${String(diaReal).padStart(2, '0')}`;
}

export function esCumpleanos(fechaNacimiento: string, hoy: string): boolean {
  const [anio] = partes(hoy);
  return hoy.slice(5) === diaDeCumpleanos(fechaNacimiento, anio);
}

export function calcularEdad(fechaNacimiento: string, hoy: string): number {
  const [anioNacimiento] = partes(fechaNacimiento);
  const [anio] = partes(hoy);
  const yaCumplio = hoy.slice(5) >= diaDeCumpleanos(fechaNacimiento, anio);
  return anio - anioNacimiento - (yaCumplio ? 0 : 1);
}

// Primer nombre, para saludar cuando no hay apodo.
export function nombreParaMostrar(nombre: string, apodo: string | null): string {
  return apodo?.trim() || nombre.trim().split(/\s+/)[0] || nombre;
}

// ---- Racha: días seguidos con al menos una sesión, de lunes a sábado. Los domingos ni suman ni la rompen.

export const esDomingo = (fecha: string) => new Date(`${fecha}T00:00:00Z`).getUTCDay() === 0;

function sumarDias(fecha: string, dias: number): string {
  return restarDias(fecha, -dias);
}

const habilAnterior = (fecha: string) => {
  const anterior = restarDias(fecha, 1);
  return esDomingo(anterior) ? restarDias(anterior, 1) : anterior;
};
const habilSiguiente = (fecha: string) => {
  const siguiente = sumarDias(fecha, 1);
  return esDomingo(siguiente) ? sumarDias(siguiente, 1) : siguiente;
};

export function calcularRacha(fechasConSesion: string[], hoy: string): { actual: number; mejor: number } {
  const dias = [...new Set(fechasConSesion.filter((fecha) => fecha <= hoy && !esDomingo(fecha)))].sort();
  const entreno = new Set(dias);

  // Si hoy aún no hay sesión (o es domingo), la racha sigue viva y se cuenta desde el día hábil anterior.
  let dia = !esDomingo(hoy) && entreno.has(hoy) ? hoy : habilAnterior(hoy);
  let actual = 0;
  while (entreno.has(dia)) {
    actual += 1;
    dia = habilAnterior(dia);
  }

  let mejor = 0;
  let seguidos = 0;
  dias.forEach((fecha, indice) => {
    seguidos = indice > 0 && habilSiguiente(dias[indice - 1]!) === fecha ? seguidos + 1 : 1;
    mejor = Math.max(mejor, seguidos);
  });

  return { actual, mejor: Math.max(mejor, actual) };
}

// ---- Récords, favorito y totales.

export interface SerieRegistro {
  reps: number;
  pesoGramos: number | null;
  rir?: number | null | undefined;
  tipoSerie?: TipoSerie | null | undefined;
  extras?: Extra[] | null | undefined;
}

export interface EjercicioConHistorial {
  id: string;
  nombre: string;
  tipo: 'peso' | 'calistenia';
  nivel: string | null;
  archivado: boolean;
  sesiones: { fecha: string; series: SerieRegistro[] }[];
}

export interface MarcaPersonal {
  valor: number;
  fecha: string;
  nuevo: boolean;
}

export type RecordEjercicio =
  | {
      ejercicioId: string;
      nombre: string;
      tipo: 'peso';
      mayorPeso: MarcaPersonal & { reps: number };
      mejor1RM: MarcaPersonal | null;
    }
  | {
      ejercicioId: string;
      nombre: string;
      tipo: 'calistenia';
      maxReps: MarcaPersonal;
      variante: string | null;
    };

const esNuevo = (fecha: string, hoy: string) => fecha > restarDias(hoy, DIAS_PR_NUEVO);

// Las sesiones se recorren de la más antigua a la más reciente: ante un empate, el récord es la primera vez.
const cronologico = (ejercicio: EjercicioConHistorial) =>
  [...ejercicio.sesiones].sort((a, b) => a.fecha.localeCompare(b.fecha));

export function recordsPersonales(ejercicios: EjercicioConHistorial[], hoy: string): RecordEjercicio[] {
  const records: RecordEjercicio[] = [];

  for (const ejercicio of ejercicios) {
    let mayorPeso: { valor: number; reps: number; fecha: string } | null = null;
    let mejor1RM: { valor: number; fecha: string } | null = null;
    let maxReps: { valor: number; fecha: string } | null = null;

    for (const sesion of cronologico(ejercicio)) {
      // Las series de aproximación no cuentan, igual que en el resto de la app.
      for (const serie of sesion.series.filter(esEfectiva)) {
        if (ejercicio.tipo === 'peso' && serie.pesoGramos !== null) {
          if (
            !mayorPeso ||
            serie.pesoGramos > mayorPeso.valor ||
            (serie.pesoGramos === mayorPeso.valor && serie.reps > mayorPeso.reps)
          ) {
            mayorPeso = { valor: serie.pesoGramos, reps: serie.reps, fecha: sesion.fecha };
          }
          const estimado = estimar1RM({
            reps: serie.reps,
            pesoGramos: serie.pesoGramos,
            rir: serie.rir ?? null,
            tipoSerie: serie.tipoSerie ?? null,
          });
          if (estimado !== null && (!mejor1RM || estimado > mejor1RM.valor)) {
            mejor1RM = { valor: estimado, fecha: sesion.fecha };
          }
        }
        if (ejercicio.tipo === 'calistenia' && (!maxReps || serie.reps > maxReps.valor)) {
          maxReps = { valor: serie.reps, fecha: sesion.fecha };
        }
      }
    }

    if (ejercicio.tipo === 'peso' && mayorPeso) {
      records.push({
        ejercicioId: ejercicio.id,
        nombre: ejercicio.nombre,
        tipo: 'peso',
        mayorPeso: { ...mayorPeso, nuevo: esNuevo(mayorPeso.fecha, hoy) },
        mejor1RM: mejor1RM ? { ...mejor1RM, nuevo: esNuevo(mejor1RM.fecha, hoy) } : null,
      });
    }
    if (ejercicio.tipo === 'calistenia' && maxReps) {
      records.push({
        ejercicioId: ejercicio.id,
        nombre: ejercicio.nombre,
        tipo: 'calistenia',
        maxReps: { ...maxReps, nuevo: esNuevo(maxReps.fecha, hoy) },
        variante: ejercicio.nivel,
      });
    }
  }

  return records.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

// El de más sesiones (incluidos los archivados); ante un empate, el de la sesión más reciente.
export function ejercicioFavorito(
  ejercicios: EjercicioConHistorial[],
): { ejercicioId: string; nombre: string; sesiones: number } | null {
  let favorito: { ejercicio: EjercicioConHistorial; ultima: string } | null = null;

  for (const ejercicio of ejercicios) {
    if (ejercicio.sesiones.length === 0) continue;
    const ultima = ejercicio.sesiones.reduce((maxima, sesion) => (sesion.fecha > maxima ? sesion.fecha : maxima), '');
    if (
      !favorito ||
      ejercicio.sesiones.length > favorito.ejercicio.sesiones.length ||
      (ejercicio.sesiones.length === favorito.ejercicio.sesiones.length && ultima > favorito.ultima)
    ) {
      favorito = { ejercicio, ultima };
    }
  }

  return favorito
    ? { ejercicioId: favorito.ejercicio.id, nombre: favorito.ejercicio.nombre, sesiones: favorito.ejercicio.sesiones.length }
    : null;
}

// Volumen: kilos × repeticiones de las series que no son de aproximación (incluye las mini series).
export function totalesEntrenamiento(ejercicios: EjercicioConHistorial[]): {
  sesiones: number;
  series: number;
  volumenKg: number;
} {
  let sesiones = 0;
  let series = 0;
  let volumenGramos = 0;
  for (const ejercicio of ejercicios) {
    for (const sesion of ejercicio.sesiones) {
      sesiones += 1;
      series += sesion.series.length;
      volumenGramos += sesion.series.filter(esEfectiva).reduce((total, serie) => total + volumenSerie(serie), 0);
    }
  }
  return { sesiones, series, volumenKg: Math.round(volumenGramos / 1000) };
}

export function fechasConSesion(ejercicios: EjercicioConHistorial[]): string[] {
  return ejercicios.flatMap((ejercicio) => ejercicio.sesiones.map((sesion) => sesion.fecha));
}
