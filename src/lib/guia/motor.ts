// Lógica pura de la guía interactiva: qué paso mostrar, cuándo avanzar y desde dónde reanudar.
import {
  IDS_RECORRIDO,
  RECORRIDOS,
  type Condicion,
  type EstadoRecorrido,
  type IdRecorrido,
  type PasoGuia,
  type Recorrido,
} from '@/lib/guia/recorridos';

export interface ProgresoRecorrido {
  estado: EstadoRecorrido;
  paso: number;
}

export type ProgresoGuia = Partial<Record<IdRecorrido, ProgresoRecorrido>>;

export function objetivos(paso: PasoGuia): string[] {
  if (paso.objetivo === null) return [];
  return Array.isArray(paso.objetivo) ? paso.objetivo : [paso.objetivo];
}

// Índice del primer paso disponible desde "desde" en la dirección indicada, o null si no hay ninguno.
// Un paso sin objetivo (burbuja centrada) siempre está disponible.
export function buscarPasoDisponible(
  pasos: PasoGuia[],
  desde: number,
  direccion: 1 | -1,
  existe: (objetivo: string) => boolean,
): number | null {
  for (let indice = desde; indice >= 0 && indice < pasos.length; indice += direccion) {
    const paso = pasos[indice]!;
    if (paso.objetivo === null || objetivos(paso).some(existe)) {
      return indice;
    }
  }
  return null;
}

export function siguientePaso(pasos: PasoGuia[], actual: number, existe: (objetivo: string) => boolean) {
  return buscarPasoDisponible(pasos, actual + 1, 1, existe);
}

export function pasoAnterior(pasos: PasoGuia[], actual: number, existe: (objetivo: string) => boolean) {
  return buscarPasoDisponible(pasos, actual - 1, -1, existe);
}

export interface LecturaObjetivo {
  hayTexto: boolean;
  cambiado: boolean;
}

export function cumpleCondicion(condicion: Condicion | undefined, lectura: LecturaObjetivo): boolean {
  if (!condicion) return true;
  return condicion.tipo === 'con_texto' ? lectura.hayTexto : lectura.cambiado;
}

// Ruta de la página -> recorrido que corresponde. ':id' es el id de un ejercicio (nunca "nuevo").
export function patronRuta(ruta: string): RegExp {
  const cuerpo = ruta
    .split('/')
    .map((parte) => (parte === ':id' ? '(?!nuevo$)[^/]+' : parte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/');
  return new RegExp(`^${cuerpo}/?$`);
}

export function recorridoDeRuta(pathname: string): Recorrido | null {
  return IDS_RECORRIDO.map((id) => RECORRIDOS[id]).find((recorrido) => patronRuta(recorrido.ruta).test(pathname)) ?? null;
}

// Paso desde el que se reanuda un recorrido en curso, dentro de los límites del recorrido.
export function pasoParaReanudar(progreso: ProgresoRecorrido | undefined, recorrido: Recorrido): number {
  if (!progreso || progreso.estado !== 'en_curso') return 0;
  return Math.min(Math.max(Math.trunc(progreso.paso), 0), recorrido.pasos.length - 1);
}

export function estaEnCurso(progreso: ProgresoGuia, id: IdRecorrido): boolean {
  return progreso[id]?.estado === 'en_curso';
}

// Ruta de entrada de un recorrido. Los de un ejercicio necesitan uno adecuado; sin él, null.
export function rutaDeEntrada(
  id: IdRecorrido,
  ejercicios: { sinPrueba: string | null; conPrueba: string | null },
): string | null {
  const recorrido = RECORRIDOS[id];
  if (!recorrido.ruta.includes(':id')) return recorrido.ruta;
  const ejercicio = id === 'prueba_inicial' ? ejercicios.sinPrueba : ejercicios.conPrueba;
  return ejercicio ? recorrido.ruta.replace(':id', encodeURIComponent(ejercicio)) : null;
}

// "Paso N de M" contando solo los pasos que se pueden mostrar en esta pantalla (el actual siempre cuenta).
export function numeracion(
  pasos: PasoGuia[],
  actual: number,
  existe: (objetivo: string) => boolean,
): { numero: number; total: number } {
  const disponibles = pasos
    .map((paso, indice) => ({ paso, indice }))
    .filter(({ paso, indice }) => indice === actual || paso.objetivo === null || objetivos(paso).some(existe));
  return {
    numero: disponibles.findIndex(({ indice }) => indice === actual) + 1,
    total: disponibles.length,
  };
}
