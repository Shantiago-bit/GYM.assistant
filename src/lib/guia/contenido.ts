// Textos de la guía, la bienvenida y los primeros pasos. Se editan aquí sin tocar los componentes.
// Los números salen de la configuración y de las reglas de la app: si cambian, la guía se actualiza sola.
import {
  CHAT_LIMITE_DIARIO,
  RANGOS_POR_ENFOQUE,
  REDUCCION_DESCARGA,
  RIR_SALTO_DOBLE,
  UMBRAL_PESO_ALTO_GRAMOS,
} from '@/lib/config/gym';
import { formatearPeso } from '@/lib/formato';
import { ENFOQUES } from '@/lib/reglas/ejercicio';
import { estimar1RM } from '@/lib/reglas/fuerza';
import { METODOS } from '@/lib/reglas/metodos';
import { incrementoPeso, pesoDeDescarga } from '@/lib/reglas/progresion';
import { TIPOS_SERIE } from '@/lib/reglas/tecnicas';

export type IdPaso =
  | 'crear_ejercicio'
  | 'prueba_inicial'
  | 'primera_sesion'
  | 'recomendacion'
  | 'entrenamiento_hoy'
  | 'preguntar_chrono';

export interface TextoPaso {
  titulo: string;
  descripcion: string;
  href: string;
}

export interface ItemGuia {
  termino?: string;
  texto: string;
}

export interface SeccionGuia {
  id: string;
  titulo: string;
  parrafos: string[];
  items?: ItemGuia[];
  ejemplo?: { titulo: string; lineas: string[] };
  preguntas?: string[];
  enlace?: { texto: string; href: string };
}

const kg = formatearPeso;
const porcentajeDescarga = `${Math.round(REDUCCION_DESCARGA * 100)} %`;
const rango = ([min, max]: readonly [number, number]) => `${min}–${max}`;
const incrementoNormal = kg(incrementoPeso(0));
const incrementoAlto = kg(incrementoPeso(UMBRAL_PESO_ALTO_GRAMOS));

// Ejemplo de recomendación calculado con las mismas funciones que usa la app.
const PESO_EJEMPLO = UMBRAL_PESO_ALTO_GRAMOS;
const RANGO_EJEMPLO = RANGOS_POR_ENFOQUE.hipertrofia.peso;
const PESO_SUBIDO = PESO_EJEMPLO + incrementoPeso(PESO_EJEMPLO);
const PESO_DESCARGA = pesoDeDescarga(PESO_EJEMPLO);
const REPS_1RM = 10;
const RIR_1RM = 2;
const UNO_RM_EJEMPLO = estimar1RM({ reps: REPS_1RM, pesoGramos: PESO_EJEMPLO, rir: RIR_1RM });

export const TEXTOS_PASOS: Record<IdPaso, TextoPaso> = {
  crear_ejercicio: {
    titulo: 'Crea tu primer ejercicio',
    descripcion: 'Elige si es de peso o de calistenia, su enfoque y su rango de repeticiones.',
    href: '/gym/ejercicios/nuevo',
  },
  prueba_inicial: {
    titulo: 'Haz la prueba inicial',
    descripcion: 'Abre el ejercicio y registra tu prueba: es tu punto de partida.',
    href: '/gym',
  },
  primera_sesion: {
    titulo: 'Registra tu primera sesión',
    descripcion: 'Anota las repeticiones y el peso de cada serie después de entrenar.',
    href: '/gym',
  },
  recomendacion: {
    titulo: 'Sigue la recomendación de la próxima sesión',
    descripcion:
      'Abre un ejercicio, mira qué te propone la app y vuelve a entrenarlo. Se marca al registrar una segunda sesión del mismo ejercicio.',
    href: '/gym',
  },
  entrenamiento_hoy: {
    titulo: 'Prueba el entrenamiento de hoy',
    descripcion: 'Registra varios ejercicios en una sola visita. Se marca cuando registras dos o más el mismo día.',
    href: '/gym/entrenamiento',
  },
  preguntar_chrono: {
    titulo: 'Pregúntale algo a CHRONO',
    descripcion: 'Tu asistente virtual: consulta tus datos, arma rutinas y resuelve dudas.',
    href: '/gym/chat',
  },
};

export const TEXTOS_PRIMEROS_PASOS = {
  titulo: 'Primeros pasos',
  siguiente: 'Siguiente paso',
  completados: (hechos: number, total: number) => `${hechos} de ${total} completados`,
  ocultar: 'Ocultar',
  felicitacion: '¡Completaste los primeros pasos! Ya conoces lo esencial de Gym Assistant.',
  felicitacionDetalle: 'Esta tarjeta no volverá a aparecer. Sigue registrando tus sesiones para progresar.',
};

export const TEXTOS_BIENVENIDA = {
  titulo: '¡Bienvenido a Gym Assistant!',
  parrafos: [
    'Esta app te ayuda a progresar con sobrecarga progresiva: registras tus ejercicios y tus sesiones, y te dice qué hacer en la siguiente.',
    'Empiezas con una prueba inicial y, según tus resultados, la app te sugiere subir repeticiones, subir peso o mantener. Además, CHRONO, tu asistente virtual, responde tus dudas.',
  ],
  verGuia: 'Ver la guía',
  crearEjercicio: 'Crear mi primer ejercicio',
  ahoraNo: 'Ahora no',
};

export const TEXTOS_VACIO = {
  titulo: 'Aún no tienes ejercicios',
  descripcion:
    'Crea tu primer ejercicio, registra la prueba inicial y la app te dirá cuándo subir el peso. Si es tu primera vez, la guía te lo explica en pocos minutos.',
  crear: 'Crear mi primer ejercicio',
  guia: 'Ver la guía',
};

export const TEXTOS_GUIA = {
  titulo: 'Guía de Gym Assistant',
  introduccion: 'Todo lo que necesitas para empezar a entrenar con la app. Puedes leerla en orden o saltar a la parte que te interese.',
  indice: 'Contenido',
  anterior: 'Anterior',
  siguiente: 'Siguiente',
  paso: (actual: number, total: number) => `Sección ${actual} de ${total}`,
  terminar: 'Terminé la guía',
  completada: '¡Guía completada! Puedes volver a consultarla cuando quieras.',
  reiniciar: 'Reiniciar la guía',
  mostrarPasos: 'Volver a mostrar los primeros pasos en Ejercicios',
  abrirChrono: 'Abrir CHRONO',
};

export const SECCIONES_GUIA: SeccionGuia[] = [
  {
    id: 'que-es',
    titulo: 'Qué es Gym Assistant',
    parrafos: [
      'Gym Assistant registra tus ejercicios y tus sesiones, y te dice qué hacer en la próxima para seguir progresando.',
      'Se basa en la sobrecarga progresiva: para que tu cuerpo siga mejorando, el esfuerzo tiene que aumentar poco a poco, sumando repeticiones o peso de forma gradual y medible.',
      'La app usa doble progresión: primero subes repeticiones dentro de un rango y, cuando llegas al tope, sube el peso y vuelves al mínimo del rango.',
    ],
  },
  {
    id: 'como-empezar',
    titulo: 'Cómo empezar',
    parrafos: [
      'Crea un ejercicio desde Ejercicios › Nuevo ejercicio. Puede ser de peso (con barra, mancuernas o máquina) o de calistenia (con tu peso corporal; en vez de subir peso, pasas a una variante más difícil).',
      'Elige el enfoque. Cada uno sugiere un rango de repeticiones, que puedes ajustar:',
    ],
    items: [
      ...ENFOQUES.map((enfoque) => ({
        termino: enfoque.texto,
        texto: `${enfoque.descripcion} Rango sugerido: ${rango(RANGOS_POR_ENFOQUE[enfoque.valor].peso)} en peso y ${rango(RANGOS_POR_ENFOQUE[enfoque.valor].calistenia)} en calistenia.`,
      })),
      ...METODOS.map((metodo) => ({
        termino: `Método: ${metodo.texto}`,
        texto: `${metodo.descripcion}${metodo.soloPeso ? ' Solo para ejercicios de peso.' : ''}`,
      })),
    ],
    enlace: { texto: 'Crear un ejercicio', href: '/gym/ejercicios/nuevo' },
  },
  {
    id: 'prueba-inicial',
    titulo: 'La prueba inicial',
    parrafos: [
      'Antes de la primera sesión de cada ejercicio, registras una prueba inicial: haces tus series con un peso que puedas controlar y anotas las repeticiones.',
      'Sirve como punto de partida. Con ella la app conoce tu nivel real y calcula la primera recomendación. Solo se hace una vez por ejercicio.',
    ],
  },
  {
    id: 'registrar-sesion',
    titulo: 'Registrar una sesión',
    parrafos: [
      'Después de entrenar, abre el ejercicio y registra la sesión: por cada serie anotas las repeticiones y el peso. La app precarga el plan sugerido para que solo ajustes lo que cambió.',
      'Opcionalmente anota el RIR (repeticiones en reserva): cuántas repeticiones más podrías haber hecho. Ayuda a afinar la progresión y el 1RM estimado.',
      'Cada serie puede usar una técnica:',
    ],
    items: TIPOS_SERIE.map((tipo) => ({ termino: tipo.texto, texto: tipo.descripcion })),
  },
  {
    id: 'recomendacion',
    titulo: 'Cómo leer la recomendación',
    parrafos: [
      'La app compara tu última sesión con el rango del ejercicio y te dice qué hacer en la próxima:',
    ],
    items: [
      {
        termino: 'Subir peso',
        texto: `Todas las series llegaron al tope del rango. Sube ${incrementoNormal} (o ${incrementoAlto} desde ${kg(UMBRAL_PESO_ALTO_GRAMOS)}) y vuelve al mínimo de repeticiones. Si en todas las series anotaste RIR ${RIR_SALTO_DOBLE} o más, el salto es doble.`,
      },
      { termino: 'Subir repeticiones', texto: 'Llegaste al mínimo pero no al tope: mantén el peso y apunta a más repeticiones.' },
      { termino: 'Mantener', texto: 'Alguna serie quedó por debajo del mínimo: repite el peso y la meta.' },
      {
        termino: 'Descarga',
        texto: `Dos sesiones seguidas con alguna serie bajo el mínimo: baja un ${porcentajeDescarga} el peso para recuperarte y vuelve a construir.`,
      },
      { termino: 'Variante más difícil', texto: 'En calistenia, en lugar de subir peso, pasas a una versión más exigente del ejercicio.' },
    ],
    ejemplo: {
      titulo: 'Ejemplo',
      lineas: [
        `Press de banca, rango ${rango(RANGO_EJEMPLO)}, con ${kg(PESO_EJEMPLO)}.`,
        `Haces ${RANGO_EJEMPLO[1]}, ${RANGO_EJEMPLO[1]} y ${RANGO_EJEMPLO[1]} repeticiones: llegaste al tope en todas. La app sugiere ${kg(PESO_SUBIDO)} y volver a ${RANGO_EJEMPLO[0]} repeticiones.`,
        `Si hubieras hecho ${RANGO_EJEMPLO[1]}, ${RANGO_EJEMPLO[1] - 2} y ${RANGO_EJEMPLO[0] + 1}: mantienes ${kg(PESO_EJEMPLO)} y apuntas a ${RANGO_EJEMPLO[1]} en todas.`,
        `Si dos sesiones seguidas no llegas a ${RANGO_EJEMPLO[0]} en alguna serie: descarga a ${kg(PESO_DESCARGA)}.`,
      ],
    },
  },
  {
    id: 'seguimiento',
    titulo: 'Entrenamiento de hoy, resumen y progreso',
    parrafos: ['Además del registro de cada ejercicio, tienes estas herramientas para seguir tu avance:'],
    items: [
      { termino: 'Entrenamiento de hoy', texto: 'Registra varios ejercicios en una sola visita, como en una rutina completa.' },
      { termino: 'Resumen', texto: 'Elige un periodo y mira cuántas sesiones hiciste y si cada ejercicio mejoró, se mantuvo o bajó.' },
      { termino: 'Histórico y tendencia', texto: 'En el detalle de cada ejercicio ves todas tus sesiones y su tendencia.' },
      {
        termino: '1RM estimado',
        texto: `Una estimación del peso máximo que podrías levantar una vez, calculada con tus series. Por ejemplo, ${REPS_1RM} repeticiones con ${kg(PESO_EJEMPLO)} y RIR ${RIR_1RM} equivalen a unos ${UNO_RM_EJEMPLO === null ? '—' : kg(UNO_RM_EJEMPLO)}.`,
      },
    ],
    enlace: { texto: 'Ir al resumen', href: '/gym/resumen' },
  },
  {
    id: 'chrono',
    titulo: 'CHRONO, tu asistente virtual',
    parrafos: [
      'CHRONO es un chat con inteligencia artificial que conoce tus ejercicios, sesiones y recomendaciones.',
      `Puede responder dudas de entrenamiento, nutrición y recuperación, armar rutinas con tus ejercicios y proponer crear, modificar o eliminar ejercicios. Ningún cambio se aplica hasta que pulsas Confirmar en la tarjeta que te muestra.`,
      `Sus límites: no da diagnósticos médicos, no registra sesiones por ti, puede equivocarse y tiene un máximo de ${CHAT_LIMITE_DIARIO} mensajes por día.`,
    ],
    preguntas: [
      '¿Qué hago en mi próxima sesión de press de banca?',
      'Arma una rutina de 3 días con mis ejercicios',
      '¿Cuánta proteína necesito para ganar músculo?',
      'Crea un ejercicio de sentadilla con 60 kg',
    ],
    enlace: { texto: 'Abrir CHRONO', href: '/gym/chat' },
  },
  {
    id: 'glosario',
    titulo: 'Glosario',
    parrafos: ['Los términos que verás en la app:'],
    items: [
      { termino: 'RIR', texto: 'Repeticiones en reserva: cuántas más podrías haber hecho al terminar la serie.' },
      { termino: 'AMRAP', texto: 'Tantas repeticiones como puedas, hasta el fallo técnico.' },
      { termino: '1RM', texto: 'El peso máximo que puedes levantar en una sola repetición. La app lo estima sin que tengas que probarlo.' },
      { termino: 'Rango objetivo', texto: 'El mínimo y el máximo de repeticiones por serie que buscas en un ejercicio.' },
      { termino: 'Descarga', texto: `Bajar el peso un ${porcentajeDescarga} cuando te estancas, para recuperarte y volver a progresar.` },
      { termino: 'Enfoque', texto: 'El objetivo del ejercicio: fuerza, hipertrofia o resistencia. Define el rango sugerido.' },
    ],
  },
];
