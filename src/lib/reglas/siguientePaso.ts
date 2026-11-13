import { formatearPeso } from '@/lib/formato';
import type { TipoEjercicio } from '@/lib/reglas/ejercicio';
import type { Metodo } from '@/lib/reglas/metodos';
import { dondeSeEvalua, type Recomendacion } from '@/lib/reglas/progresion';

// Qué hacer ahora, en lenguaje llano y con un solo botón. Solo arma textos: la recomendación sale de
// recomendarSiguiente y no se recalcula aquí.

export interface SiguientePaso {
  titulo: string;
  explicacion: string;
  accion: { texto: string; href: string };
}

interface DatosEjercicio {
  id: string;
  nombre: string;
  tipo: TipoEjercicio;
  metodo: Metodo;
  rango: [number, number];
}

export type EstadoEjercicio =
  | { estado: 'sin_ejercicios' }
  | { estado: 'sin_prueba'; ejercicio: Pick<DatosEjercicio, 'id' | 'nombre'> }
  | { estado: 'sin_sesiones'; ejercicio: DatosEjercicio; recomendacion: Recomendacion }
  | { estado: 'con_recomendacion'; ejercicio: DatosEjercicio; recomendacion: Recomendacion };

export const TEXTO_ANOTAR_EJERCICIO = 'Anotar solo este ejercicio';

const plural = (cantidad: number, singular: string, varios: string) => (cantidad === 1 ? singular : varios);

// "por serie" cuando cuentan todas las series; con una sola serie clave, cuál es.
function dondeBuscar(metodo: Metodo): string {
  return metodo === 'rectas' || metodo === 'cluster' ? 'por serie' : dondeSeEvalua(metodo);
}

// Frase de acción concreta para la próxima vez, por ejemplo
// "La próxima vez usa 62,5 kg y busca 8 repeticiones por serie."
export function fraseAccion(
  recomendacion: Recomendacion,
  d: { tipo: TipoEjercicio; metodo: Metodo; rango: [number, number] },
): string {
  const meta = recomendacion.metaRepsSugerida;
  const minimo = d.rango[0];
  const peso = formatearPeso(recomendacion.pesoSugeridoGramos ?? 0);
  const todas = dondeSeEvalua(d.metodo);

  if (d.tipo === 'calistenia') {
    switch (recomendacion.accion) {
      case 'subir_variante':
        return `Pasa a una versión más difícil del ejercicio y busca ${meta} repeticiones ${dondeBuscar(d.metodo)}.`;
      case 'subir_reps':
        return `Repite la misma versión del ejercicio e intenta llegar a ${meta} repeticiones ${todas}.`;
      default:
        return `Repite la misma versión del ejercicio y busca al menos ${minimo} repeticiones ${todas}.`;
    }
  }

  switch (recomendacion.accion) {
    case 'subir_peso':
      return `La próxima vez usa ${peso} y busca ${meta} repeticiones ${dondeBuscar(d.metodo)}.`;
    case 'subir_reps':
      return `Repite el mismo peso (${peso}) e intenta llegar a ${meta} repeticiones ${todas}.`;
    case 'bajar_peso':
      return `Esta semana baja a ${peso} para recuperarte; la siguiente vuelves a subir.`;
    default:
      return `Repite el mismo peso (${peso}) y busca al menos ${minimo} repeticiones ${todas}.`;
  }
}

// Título corto de la acción: "Sube a 62,5 kg", "Suma repeticiones"…
export function tituloAccion(recomendacion: Recomendacion): string {
  const peso = formatearPeso(recomendacion.pesoSugeridoGramos ?? 0);
  switch (recomendacion.accion) {
    case 'subir_peso':
      return `Sube a ${peso}`;
    case 'subir_reps':
      return 'Suma repeticiones';
    case 'bajar_peso':
      return `Baja a ${peso} para recuperarte`;
    case 'subir_variante':
      return 'Pasa a una versión más difícil';
    case 'mantener':
      return 'Repite el mismo objetivo';
  }
}

// Siguiente paso de un ejercicio (o de una cuenta sin ejercicios).
export function siguientePaso(estado: EstadoEjercicio, avanzado = false): SiguientePaso {
  switch (estado.estado) {
    case 'sin_ejercicios':
      return {
        titulo: 'Crea tu primer ejercicio',
        explicacion: 'Solo necesitas su nombre y saber si es con peso o con tu cuerpo.',
        accion: { texto: 'Crear mi primer ejercicio', href: '/gym/ejercicios/nuevo' },
      };
    case 'sin_prueba':
      return {
        titulo: avanzado ? 'Primero, registra la prueba inicial' : 'Primero, haz tu primera medición',
        explicacion: 'Anota cuántas repeticiones logras hoy. Así sabremos desde dónde empezar.',
        accion: {
          texto: avanzado ? 'Registrar prueba inicial' : 'Hacer la primera medición',
          href: `/gym/ejercicios/${estado.ejercicio.id}/prueba`,
        },
      };
    case 'sin_sesiones':
      return {
        titulo: 'Ya tienes tu punto de partida',
        explicacion: `${fraseAccion(estado.recomendacion, estado.ejercicio)} Cuando lo hagas, anótalo aquí.`,
        accion: { texto: TEXTO_ANOTAR_EJERCICIO, href: `/gym/ejercicios/${estado.ejercicio.id}/sesion` },
      };
    case 'con_recomendacion':
      return {
        titulo: tituloAccion(estado.recomendacion),
        explicacion: fraseAccion(estado.recomendacion, estado.ejercicio),
        accion: { texto: TEXTO_ANOTAR_EJERCICIO, href: `/gym/ejercicios/${estado.ejercicio.id}/sesion` },
      };
  }
}

export interface EjercicioDeHoy {
  id: string;
  nombre: string;
  tipo: TipoEjercicio;
  archivado: boolean;
  // Incluye la prueba inicial: 0 es que falta la primera medición.
  totalSesiones: number;
  listoParaSubir: boolean;
}

function textoListos(listos: EjercicioDeHoy[]): string {
  const cantidad = listos.length;
  const cuanto = listos.every((ejercicio) => ejercicio.tipo === 'peso')
    ? 'de peso'
    : listos.every((ejercicio) => ejercicio.tipo === 'calistenia')
      ? 'de nivel'
      : 'de peso o de nivel';
  return `Tienes ${cantidad} ${plural(cantidad, 'ejercicio listo', 'ejercicios listos')} para subir ${cuanto}.`;
}

// Franja "Hoy" de /gym: el paso más útil para hoy según los ejercicios, los días de entrenamiento y la racha.
export function pasoDeHoy(d: {
  ejercicios: EjercicioDeHoy[];
  hoyEsDescanso: boolean;
  entrenoHoy: boolean;
  rachaActual: number;
  // Nombre del día del próximo entrenamiento ("jueves"), o null si no hay en la próxima semana.
  proximoDia: string | null;
  avanzado?: boolean;
}): SiguientePaso {
  const activos = d.ejercicios.filter((ejercicio) => !ejercicio.archivado);
  if (activos.length === 0) {
    return siguientePaso({ estado: 'sin_ejercicios' }, d.avanzado);
  }

  const sinPrueba = activos.filter((ejercicio) => ejercicio.totalSesiones === 0);
  const conPrueba = activos.filter((ejercicio) => ejercicio.totalSesiones > 0);
  const listos = conPrueba.filter((ejercicio) => ejercicio.listoParaSubir);
  const pendiente = sinPrueba[0];

  // Nada que entrenar todavía: lo primero es la primera medición.
  if (conPrueba.length === 0 && pendiente) {
    const paso = siguientePaso({ estado: 'sin_prueba', ejercicio: pendiente }, d.avanzado);
    return { ...paso, titulo: `${paso.titulo} de ${pendiente.nombre}` };
  }

  const racha = d.rachaActual >= 2 ? ` Llevas una racha de ${d.rachaActual} días.` : '';
  const verProgreso = { texto: 'Ver mi progreso', href: '/gym/resumen' };
  const medir = pendiente
    ? {
        texto: d.avanzado ? `Prueba inicial de ${pendiente.nombre}` : `Medir ${pendiente.nombre}`,
        href: `/gym/ejercicios/${pendiente.id}/prueba`,
      }
    : null;

  if (d.entrenoHoy) {
    return {
      titulo: 'Hoy ya entrenaste ✓',
      explicacion: `Buen trabajo.${racha}${
        pendiente ? ` Cuando puedas, haz la primera medición de ${pendiente.nombre}.` : ' Mira cómo vas en tu progreso.'
      }`,
      accion: medir ?? verProgreso,
    };
  }

  if (!d.hoyEsDescanso) {
    return {
      titulo: 'Hoy toca entrenar',
      explicacion: `${listos.length > 0 ? `${textoListos(listos)} ` : ''}Anota todos los ejercicios que hagas hoy en un solo lugar.${racha}`,
      accion: { texto: 'Registrar mi entrenamiento', href: '/gym/entrenamiento' },
    };
  }

  const proximo = d.proximoDia ? ` Tu próximo entrenamiento es el ${d.proximoDia}.` : '';
  return {
    titulo: 'Hoy descansas: tu racha sigue',
    explicacion: `Descansar también es parte del progreso.${proximo}${listos.length > 0 ? ` ${textoListos(listos)}` : ''}`,
    accion: medir ?? verProgreso,
  };
}
