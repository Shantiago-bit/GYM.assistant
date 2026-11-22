// Reglas puras del inicio (/gym): la semana, el resumen de hoy, la tarjeta "Esta semana", el último récord, las
// mini tendencias y la frase corta de cada ejercicio. Fechas AAAA-MM-DD en la zona horaria de la app.
import { DIAS_PR_NUEVO } from '@/lib/config/gym';
import { formatearPeso } from '@/lib/formato';
import { restarDias } from '@/lib/reglas/fechas';
import { mejor1RM } from '@/lib/reglas/fuerza';
import { recomendarSiguiente, type Recomendacion } from '@/lib/reglas/progresion';
import {
  diaSemana,
  diasEnFecha,
  LETRAS_DIA,
  NOMBRES_DIA,
  type TramoDias,
} from '@/lib/reglas/racha';
import { tituloAccion } from '@/lib/reglas/siguientePaso';
import { esEfectiva, volumenSerie, type Extra, type TipoSerie } from '@/lib/reglas/tecnicas';
import type { Metodo } from '@/lib/reglas/metodos';
import type { TipoEjercicio } from '@/lib/reglas/ejercicio';

export interface SerieInicio {
  reps: number;
  pesoGramos: number | null;
  rir?: number | null | undefined;
  tipoSerie?: TipoSerie | null | undefined;
  extras?: Extra[] | null | undefined;
}

// Una sesión con su ejercicio. Las sesiones llegan de la más antigua a la más reciente.
export interface SesionInicio {
  ejercicioId: string;
  nombre: string;
  tipo: TipoEjercicio;
  fecha: string;
  series: SerieInicio[];
}

// ---- Semana (lunes a domingo).

export function inicioDeSemana(fecha: string): string {
  return restarDias(fecha, diaSemana(fecha) - 1);
}

export type EstadoDia = 'entrenado' | 'planificado' | 'descanso';

export interface DiaSemana {
  fecha: string;
  dia: number; // 1 = lunes … 7 = domingo
  letra: string;
  nombre: string;
  estado: EstadoDia;
  planificado: boolean; // según los días de entrenamiento vigentes ese día
  esHoy: boolean;
  esFuturo: boolean;
  // Ejercicios registrados ese día, sin repetir, en el orden en que se anotaron.
  ejercicios: { id: string; nombre: string }[];
}

export function estadosSemana(d: {
  hoy: string;
  historialDias: TramoDias[];
  sesiones: SesionInicio[];
}): DiaSemana[] {
  const lunes = inicioDeSemana(d.hoy);
  return Array.from({ length: 7 }, (_, indice) => {
    const fecha = restarDias(lunes, -indice);
    const dia = indice + 1;
    const ejercicios: { id: string; nombre: string }[] = [];
    for (const sesion of d.sesiones) {
      if (
        sesion.fecha === fecha &&
        !ejercicios.some((ejercicio) => ejercicio.id === sesion.ejercicioId)
      ) {
        ejercicios.push({ id: sesion.ejercicioId, nombre: sesion.nombre });
      }
    }
    const planificado = diasEnFecha(d.historialDias, fecha).includes(dia);
    const estado: EstadoDia =
      ejercicios.length > 0 ? 'entrenado' : planificado ? 'planificado' : 'descanso';
    return {
      fecha,
      dia,
      letra: LETRAS_DIA[dia]!,
      nombre: NOMBRES_DIA[dia]!,
      estado,
      planificado,
      esHoy: fecha === d.hoy,
      esFuturo: fecha > d.hoy,
      ejercicios,
    };
  });
}

// Días planificados de la semana y cuántos de ellos ya se entrenaron (los días extra no suman aquí).
export function progresoSemana(dias: DiaSemana[]): {
  entrenados: number;
  planificados: number;
  fraccion: number;
} {
  const planificados = dias.filter((dia) => dia.planificado).length;
  const entrenados = dias.filter((dia) => dia.planificado && dia.estado === 'entrenado').length;
  return { entrenados, planificados, fraccion: planificados === 0 ? 0 : entrenados / planificados };
}

// Texto alternativo del anillo de racha.
export function textoAnillo(
  racha: number,
  progreso: { entrenados: number; planificados: number },
): string {
  const dias = racha === 1 ? 'día' : 'días';
  return `Racha de ${racha} ${dias}; esta semana entrenaste ${progreso.entrenados} de ${progreso.planificados} días planificados`;
}

// ---- Volumen y resumen de hoy.

const volumenSesion = (sesion: SesionInicio) =>
  sesion.series.filter(esEfectiva).reduce((total, serie) => total + volumenSerie(serie), 0);

export function resumenDeHoy(
  sesiones: SesionInicio[],
  hoy: string,
): { ejercicios: number; series: number; volumenKg: number } {
  const deHoy = sesiones.filter((sesion) => sesion.fecha === hoy);
  return {
    ejercicios: new Set(deHoy.map((sesion) => sesion.ejercicioId)).size,
    series: deHoy.reduce((total, sesion) => total + sesion.series.length, 0),
    volumenKg: Math.round(deHoy.reduce((total, sesion) => total + volumenSesion(sesion), 0) / 1000),
  };
}

// ---- Tarjeta "Esta semana": sesiones y volumen de la semana actual, y el volumen de las últimas 4 semanas.

export const SEMANAS_GRAFICO = 4;

export interface SemanaVolumen {
  inicio: string; // lunes
  sesiones: number;
  volumenKg: number;
}

export function tarjetaSemana(
  sesiones: SesionInicio[],
  hoy: string,
): { actual: SemanaVolumen; semanas: SemanaVolumen[] } {
  const lunes = inicioDeSemana(hoy);
  const semanas: SemanaVolumen[] = Array.from({ length: SEMANAS_GRAFICO }, (_, indice) => {
    const inicio = restarDias(lunes, 7 * (SEMANAS_GRAFICO - 1 - indice));
    const fin = restarDias(inicio, -6);
    const dentro = sesiones.filter(
      (sesion) => sesion.fecha >= inicio && sesion.fecha <= fin && sesion.fecha <= hoy,
    );
    return {
      inicio,
      sesiones: dentro.length,
      volumenKg: Math.round(
        dentro.reduce((total, sesion) => total + volumenSesion(sesion), 0) / 1000,
      ),
    };
  });
  return { actual: semanas.at(-1)!, semanas };
}

// Primera fecha que necesita el inicio para la tarjeta "Esta semana" (el lunes de hace 3 semanas).
export function desdeParaInicio(hoy: string): string {
  return restarDias(inicioDeSemana(hoy), 7 * (SEMANAS_GRAFICO - 1));
}

// ---- Último récord.

// Mejores marcas de una sesión, calculadas en la base (sin traer las series): el mayor peso con sus repeticiones
// y el máximo de repeticiones, sin contar las series de aproximación.
export interface MarcaSesion {
  ejercicioId: string;
  nombre: string;
  tipo: TipoEjercicio;
  fecha: string;
  pesoMaxGramos: number | null;
  repsEnPesoMax: number | null;
  repsMax: number | null;
}

export interface UltimoRecord {
  ejercicioId: string;
  nombre: string;
  tipo: TipoEjercicio;
  valor: number; // gramos (peso) o repeticiones (con tu cuerpo)
  reps: number | null; // repeticiones con el mayor peso
  fecha: string;
  diasDesde: number;
  nuevo: boolean;
}

const diasEntre = (desde: string, hasta: string) =>
  Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000);

// El récord vigente de cada ejercicio, con las mismas reglas que el perfil (recordsPersonales): con peso, el
// mayor peso (ante el mismo peso, más repeticiones); con tu cuerpo, el máximo de repeticiones. Ante un empate,
// el récord es la primera vez. De todos, el más reciente; ante la misma fecha, el primero por nombre.
export function ultimoRecord(marcas: MarcaSesion[], hoy: string): UltimoRecord | null {
  const porEjercicio = new Map<string, UltimoRecord>();
  const ordenadas = [...marcas].sort((a, b) => a.fecha.localeCompare(b.fecha));

  for (const marca of ordenadas) {
    const actual = porEjercicio.get(marca.ejercicioId);
    let candidato: { valor: number; reps: number | null } | null = null;
    if (marca.tipo === 'peso' && marca.pesoMaxGramos !== null) {
      const reps = marca.repsEnPesoMax ?? 0;
      if (
        !actual ||
        marca.pesoMaxGramos > actual.valor ||
        (marca.pesoMaxGramos === actual.valor && reps > (actual.reps ?? 0))
      ) {
        candidato = { valor: marca.pesoMaxGramos, reps };
      }
    }
    if (
      marca.tipo === 'calistenia' &&
      marca.repsMax !== null &&
      (!actual || marca.repsMax > actual.valor)
    ) {
      candidato = { valor: marca.repsMax, reps: null };
    }
    if (candidato) {
      porEjercicio.set(marca.ejercicioId, {
        ejercicioId: marca.ejercicioId,
        nombre: marca.nombre,
        tipo: marca.tipo,
        ...candidato,
        fecha: marca.fecha,
        diasDesde: diasEntre(marca.fecha, hoy),
        nuevo: marca.fecha > restarDias(hoy, DIAS_PR_NUEVO),
      });
    }
  }

  return (
    [...porEjercicio.values()].sort(
      (a, b) => b.fecha.localeCompare(a.fecha) || a.nombre.localeCompare(b.nombre, 'es'),
    )[0] ?? null
  );
}

export function haceDias(dias: number): string {
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias} días`;
}

// ---- Mini tendencia de cada ejercicio: el 1RM estimado (con peso) o el máximo de repeticiones (con tu cuerpo)
// de sus últimas sesiones, de la más antigua a la más reciente.

export const SESIONES_TENDENCIA = 6;

export function tendenciaEjercicio(sesiones: SesionInicio[], tipo: TipoEjercicio): number[] {
  return sesiones
    .slice(-SESIONES_TENDENCIA)
    .map((sesion) => {
      const efectivas = sesion.series.filter(esEfectiva);
      if (tipo === 'peso') {
        return mejor1RM(
          efectivas.map((serie) => ({
            reps: serie.reps,
            pesoGramos: serie.pesoGramos,
            rir: serie.rir ?? null,
          })),
        );
      }
      return efectivas.length === 0 ? null : Math.max(...efectivas.map((serie) => serie.reps));
    })
    .filter((valor): valor is number => valor !== null);
}

export function textoTendencia(valores: number[], tipo: TipoEjercicio, avanzado: boolean): string {
  if (valores.length < 2) return 'Aún no hay suficientes sesiones para ver la tendencia';
  const primero = valores[0]!;
  const ultimo = valores.at(-1)!;
  const sentido = ultimo > primero ? 'sube' : ultimo < primero ? 'baja' : 'se mantiene';
  const que =
    tipo === 'peso'
      ? avanzado
        ? '1RM estimado'
        : 'peso máximo estimado'
      : 'máximo de repeticiones';
  const formato = (valor: number) =>
    tipo === 'peso' ? formatearPeso(Math.round(valor / 100) * 100) : `${valor}`;
  return `Tendencia de las últimas ${valores.length} sesiones: el ${que} ${sentido}, de ${formato(primero)} a ${formato(ultimo)}`;
}

// ---- Recomendación de cada tarjeta, con las dos últimas sesiones que ya trae el inicio. Es el mismo cálculo
// que src/lib/datos/recomendacion.ts (recomendarSobreUltimaSesion), sin otra consulta por ejercicio.

export interface EjercicioParaRecomendar {
  tipo: TipoEjercicio;
  metodo: Metodo;
  rango: [number, number];
  pesoRefGramos: number | null;
  metaReps: number;
}

export function recomendacionDelListado(
  ejercicio: EjercicioParaRecomendar,
  sesiones: SesionInicio[],
): Recomendacion | null {
  const ultima = sesiones.at(-1);
  if (!ultima) return null;
  const anterior = sesiones.length > 1 ? sesiones.at(-2)! : null;
  const efectivasUltima = ultima.series.filter(esEfectiva);
  const efectivasAnterior = anterior ? anterior.series.filter(esEfectiva) : [];
  return recomendarSiguiente({
    tipo: ejercicio.tipo,
    rango: ejercicio.rango,
    pesoActualGramos: ejercicio.pesoRefGramos,
    metaRepsActual: ejercicio.metaReps,
    repsPorSerie: efectivasUltima.map((serie) => serie.reps),
    rirPorSerie: efectivasUltima.map((serie) => serie.rir ?? null),
    pesosPorSerie: efectivasUltima.map((serie) => serie.pesoGramos),
    repsSesionAnterior: efectivasAnterior.map((serie) => serie.reps),
    metodo: ejercicio.metodo,
  });
}

export type TonoFrase = 'subir' | 'mantener' | 'descarga';

// Frase corta de la tarjeta, con su color de significado.
export function fraseCorta(
  recomendacion: Recomendacion | null,
  avanzado: boolean,
): { texto: string; tono: TonoFrase } {
  if (!recomendacion) {
    return {
      texto: avanzado ? 'Falta la prueba inicial' : 'Falta la primera medición',
      tono: 'mantener',
    };
  }
  switch (recomendacion.accion) {
    case 'subir_peso':
    case 'subir_variante':
      return { texto: tituloAccion(recomendacion), tono: 'subir' };
    case 'bajar_peso':
      return { texto: tituloAccion(recomendacion), tono: 'descarga' };
    default:
      return { texto: tituloAccion(recomendacion), tono: 'mantener' };
  }
}

// ---- Saludo.

const FORMATO_FECHA_CORTA = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

// "Sábado, 22 de noviembre"
export function fechaCorta(fecha: string): string {
  const texto = FORMATO_FECHA_CORTA.format(new Date(`${fecha}T00:00:00Z`));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ---- Preguntas sugeridas para CHRONO (se abren en /gym/chat ya escritas, sin enviarse).

export const PREGUNTAS_CHRONO = [
  '¿Qué entreno hoy?',
  '¿Cómo voy esta semana?',
  '¿Qué ejercicio me conviene subir?',
] as const;
export const LARGO_MAXIMO_PREGUNTA = 300;

export function preguntaInicial(valor: string | string[] | undefined): string {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return (texto ?? '').trim().slice(0, LARGO_MAXIMO_PREGUNTA);
}

// ---- Filtros de "Mis ejercicios". Se aplican en el navegador (ver ListaEjercicios): la lista completa ya llega
// del servidor y la URL cambia con history.pushState, sin pedir la página otra vez.

export type FiltroEjercicios = 'todos' | 'peso' | 'calistenia' | 'listos';

export const FILTROS_EJERCICIOS: { valor: FiltroEjercicios; texto: string; href: string }[] = [
  { valor: 'todos', texto: 'Todos', href: '/gym' },
  { valor: 'peso', texto: 'Peso', href: '/gym?tipo=peso' },
  { valor: 'calistenia', texto: 'Con tu cuerpo', href: '/gym?tipo=calistenia' },
  { valor: 'listos', texto: 'Listos para subir', href: '/gym?listos=1' },
];

// Qué muestra la lista según la consulta de la URL (?archivados=1, ?listos=1 o ?tipo=peso|calistenia).
export function vistaEjercicios(consulta: string): { archivados: boolean; filtro: FiltroEjercicios } {
  const parametros = new URLSearchParams(consulta);
  const tipo = parametros.get('tipo');
  return {
    archivados: parametros.get('archivados') === '1',
    filtro: parametros.get('listos') === '1' ? 'listos' : tipo === 'peso' || tipo === 'calistenia' ? tipo : 'todos',
  };
}

export function pasaFiltro(ejercicio: { tipo: TipoEjercicio; listo: boolean }, filtro: FiltroEjercicios): boolean {
  if (filtro === 'listos') return ejercicio.listo;
  return filtro === 'todos' || ejercicio.tipo === filtro;
}
