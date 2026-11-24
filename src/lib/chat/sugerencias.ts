import type { NombreIcono } from '@/components/ui/Icono';
import { restarDias } from '@/lib/reglas/fechas';

// Sugerencias del estado vacío del chat, con REGLAS (no IA) a partir de los mismos datos que ya ve CHRONO.
// Fechas AAAA-MM-DD en la zona horaria de la app.
export interface Sugerencia {
  texto: string;
  icono: NombreIcono;
}

export type EstadoHoy = 'entrenar' | 'descanso' | 'entrenado';

export interface EjercicioParaSugerir {
  nombre: string;
  listo: boolean; // ya le toca subir
  // Una marca por sesión, de la más antigua a la más reciente: el 1RM estimado (con peso) o las repeticiones.
  marcas: { fecha: string; valor: number }[];
}

export interface DatosSugerencias {
  hoy: string;
  estadoHoy: EstadoHoy;
  ejercicios: EjercicioParaSugerir[];
}

export const DIAS_ESTANCADO = 14;

// Estancado: la mejor marca no mejora desde hace 2 semanas o más y desde entonces hubo al menos 2 sesiones.
export function estaEstancado(marcas: EjercicioParaSugerir['marcas'], hoy: string): boolean {
  if (marcas.length < 3) return false;
  const ordenadas = [...marcas].sort((a, b) => a.fecha.localeCompare(b.fecha));
  let mejor = ordenadas[0]!;
  for (const marca of ordenadas) if (marca.valor > mejor.valor) mejor = marca;
  const despues = ordenadas.filter((marca) => marca.fecha > mejor.fecha).length;
  return mejor.fecha <= restarDias(hoy, DIAS_ESTANCADO) && despues >= 2;
}

const POR_DEFECTO: Sugerencia = { texto: 'Arma una rutina para mis días de entrenamiento', icono: 'cuadro' };
const RELLENO: Sugerencia[] = [
  { texto: '¿Cómo voy en mis ejercicios?', icono: 'trofeo' },
  { texto: '¿Cómo funciona la doble progresión?', icono: 'pregunta' },
];

// Tres sugerencias, de la más útil hoy a la más general.
export function sugerenciasInteligentes(d: DatosSugerencias): Sugerencia[] {
  const lista: Sugerencia[] = [];
  if (d.ejercicios.length === 0) {
    lista.push({ texto: 'Ayúdame a crear mi primera rutina', icono: 'mancuerna' });
  } else {
    if (d.estadoHoy === 'entrenar') lista.push({ texto: '¿Qué entreno hoy?', icono: 'cronometro' });
    const listo = d.ejercicios.find((ejercicio) => ejercicio.listo);
    if (listo) lista.push({ texto: `¿Por qué me toca subir en ${listo.nombre}?`, icono: 'flechaArriba' });
    const estancado = d.ejercicios.find((ejercicio) => estaEstancado(ejercicio.marcas, d.hoy));
    if (estancado) lista.push({ texto: `Estoy estancado en ${estancado.nombre}, ¿qué hago?`, icono: 'grafico' });
  }
  for (const sugerencia of [POR_DEFECTO, ...RELLENO]) {
    if (lista.length >= 3) break;
    if (!lista.some((s) => s.texto === sugerencia.texto)) lista.push(sugerencia);
  }
  return lista.slice(0, 3);
}

// Chips por tema: cada pregunta se ESCRIBE en el campo para editarla (no se envía sola).
export const PREGUNTAS_POR_TEMA: { tema: string; preguntas: string[] }[] = [
  {
    tema: 'Hoy',
    preguntas: ['¿Qué entreno hoy?', '¿Cuánto peso uso hoy en cada ejercicio?', 'Hoy tengo poco tiempo, ¿qué hago?', 'Hoy estoy cansado, ¿entreno igual?'],
  },
  {
    tema: 'Mi progreso',
    preguntas: ['¿Cómo voy en mis ejercicios?', '¿En qué ejercicio mejoré más este mes?', '¿Cuáles son mis récords?', '¿Qué ejercicio está estancado?'],
  },
  {
    tema: 'Rutinas',
    preguntas: ['Arma una rutina para mis días de entrenamiento', 'Organiza mis ejercicios por días', '¿Cuántas series debería hacer por semana?'],
  },
  {
    tema: 'Ejercicios',
    preguntas: ['¿Qué ejercicio me falta para tener una rutina completa?', 'Propón un ejercicio nuevo para piernas', '¿Debería cambiar el rango de repeticiones de algún ejercicio?'],
  },
  {
    tema: 'Técnica',
    preguntas: ['¿Cómo hago bien una sentadilla?', '¿Qué es el RIR y cómo lo uso?', '¿Cuánto descanso entre series?', '¿Cómo calentar antes de entrenar?'],
  },
];

// Chips de seguimiento cuando ya hay conversación: se escriben en el campo.
export const SEGUIMIENTOS = ['Explícalo más simple', 'Dame un ejemplo', '¿Y para mañana?'];
