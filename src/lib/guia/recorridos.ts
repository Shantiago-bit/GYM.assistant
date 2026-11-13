// Recorridos de la guía interactiva, definidos como datos. Para agregar un paso: pon data-guia="<id>" en el
// elemento real y añade aquí { objetivo: '<id>', ... }. Los números salen de la configuración y de las
// reglas de la app, así que los textos no quedan desactualizados si cambian.
import { CHAT_LIMITE_DIARIO, RANGOS_POR_ENFOQUE, REDUCCION_DESCARGA, RIR_SALTO_DOBLE, UMBRAL_PESO_ALTO_GRAMOS } from '@/lib/config/gym';
import { formatearPeso } from '@/lib/formato';
import { METODOS } from '@/lib/reglas/metodos';
import { incrementoPeso } from '@/lib/reglas/progresion';
import { TIPOS_SERIE } from '@/lib/reglas/tecnicas';

export const IDS_RECORRIDO = ['inicio', 'crear_ejercicio', 'prueba_inicial', 'detalle', 'sesion'] as const;
export type IdRecorrido = (typeof IDS_RECORRIDO)[number];

export const ESTADOS_RECORRIDO = ['pendiente', 'en_curso', 'completado', 'saltado'] as const;
export type EstadoRecorrido = (typeof ESTADOS_RECORRIDO)[number];

// "Info" solo explica; "interactivo" deja usar el elemento resaltado; "navegacion" pide pulsarlo y la guía
// sigue en la página de destino.
export type TipoPaso = 'info' | 'interactivo' | 'navegacion';

// con_texto: algún campo del elemento tiene texto. cambiado: la persona cambió algo dentro del elemento.
export interface Condicion {
  tipo: 'con_texto' | 'cambiado';
  avanzaSolo?: boolean;
}

export interface PasoGuia {
  // Valor de data-guia del elemento. Con varios, se usa el primero visible. null: burbuja centrada.
  objetivo: string | string[] | null;
  titulo: string;
  texto: string;
  tipo: TipoPaso;
  condicion?: Condicion;
  continua?: IdRecorrido; // en pasos de navegación: recorrido que sigue en la página de destino
  enlaces?: { texto: string; href: string }[];
}

export interface Recorrido {
  id: IdRecorrido;
  titulo: string;
  descripcion: string;
  ruta: string; // ':id' es un ejercicio
  pasos: PasoGuia[];
}

const kg = formatearPeso;
const rango = ([min, max]: readonly [number, number]) => `${min}–${max}`;
const RANGO_EJEMPLO = RANGOS_POR_ENFOQUE.hipertrofia.peso;
const PESO_EJEMPLO = UMBRAL_PESO_ALTO_GRAMOS;
const metodosCalistenia = METODOS.filter((metodo) => !metodo.soloPeso).map((metodo) => metodo.texto.toLowerCase());
const tecnicas = TIPOS_SERIE.filter((tipo) => tipo.valor !== 'normal').map((tipo) => tipo.texto);

export const RECORRIDOS: Record<IdRecorrido, Recorrido> = {
  inicio: {
    id: 'inicio',
    titulo: 'Conoce la app',
    descripcion: 'El menú, tus ejercicios y cómo empezar.',
    ruta: '/gym',
    pasos: [
      {
        objetivo: 'menu-movil',
        titulo: 'El menú',
        texto: 'Aquí están todas las secciones: Mis ejercicios, Entrenar hoy, Mi progreso, CHRONO (tu asistente) y tu perfil.',
        tipo: 'info',
      },
      {
        objetivo: 'nav-ejercicios',
        titulo: 'Mis ejercicios',
        texto: 'Tu lista de ejercicios. Cada uno muestra el peso que usas, cuántas repeticiones buscas y si ya te toca subir.',
        tipo: 'info',
      },
      {
        objetivo: 'nav-entrenamiento',
        titulo: 'Entrenar hoy',
        texto: 'Anota todos los ejercicios que hiciste hoy en un solo lugar.',
        tipo: 'info',
      },
      {
        objetivo: 'nav-resumen',
        titulo: 'Mi progreso',
        texto: 'Elige un periodo y mira cuántas veces entrenaste y cómo mejoró cada ejercicio.',
        tipo: 'info',
      },
      {
        objetivo: 'nav-chrono',
        titulo: 'CHRONO (asistente)',
        texto: `Tu asistente: conoce tus datos, responde preguntas, arma rutinas y puede crear, cambiar, archivar o restaurar ejercicios si se lo confirmas. Hasta ${CHAT_LIMITE_DIARIO} mensajes por día.`,
        tipo: 'info',
      },
      {
        objetivo: 'hoy',
        titulo: 'Hoy',
        texto: 'Aquí la app te dice qué te conviene hacer hoy, con un solo botón.',
        tipo: 'info',
      },
      {
        objetivo: 'estadisticas',
        titulo: 'Tus números',
        texto: 'Cuántos ejercicios tienes, cuántas sesiones anotaste y cuántos están listos para subir.',
        tipo: 'info',
      },
      {
        objetivo: 'filtros',
        titulo: 'Filtros',
        texto: 'Mira solo los ejercicios con peso o con tu cuerpo, y los activos o los archivados.',
        tipo: 'info',
      },
      {
        objetivo: 'tarjeta-ejercicio',
        titulo: 'Un ejercicio',
        texto: 'Desde aquí anotas una sesión o abres el ejercicio para ver qué hacer la próxima vez.',
        tipo: 'info',
      },
      {
        objetivo: 'dias-entrenamiento',
        titulo: 'Tus días de entrenamiento',
        texto: 'En tu perfil eliges qué días entrenas. Tu racha solo cuenta esos días: los demás son descanso y no la rompen.',
        tipo: 'info',
      },
      {
        objetivo: 'menu-perfil',
        titulo: 'Tu perfil',
        texto: 'Tus datos, tu foto, tus récords, tu racha y las opciones avanzadas. En este menú también está la Guía, para repetir cada recorrido cuando quieras.',
        tipo: 'info',
      },
      {
        objetivo: 'nuevo-ejercicio',
        titulo: 'Crea tu primer ejercicio',
        texto: 'Vamos a crear tu primer ejercicio. Pulsa el botón y te acompaño.',
        tipo: 'navegacion',
        continua: 'crear_ejercicio',
      },
    ],
  },
  crear_ejercicio: {
    id: 'crear_ejercicio',
    titulo: 'Crear un ejercicio',
    descripcion: 'Qué pide el formulario y cómo progresa.',
    ruta: '/gym/ejercicios/nuevo',
    pasos: [
      {
        objetivo: 'crear-nombre',
        titulo: 'Nombre',
        texto: 'Escribe el nombre del ejercicio, por ejemplo "Press de banca".',
        tipo: 'interactivo',
        condicion: { tipo: 'con_texto' },
      },
      {
        objetivo: 'crear-tipo',
        titulo: '¿Con peso o con tu cuerpo?',
        texto: 'Con peso: barra, mancuernas o máquina; cuando progresas, subes el peso. Con tu cuerpo: flexiones, dominadas…; cuando progresas, pasas a una versión más difícil.',
        tipo: 'interactivo',
      },
      {
        objetivo: 'crear-enfoque',
        titulo: 'Qué buscas',
        texto: `Ganar fuerza (${rango(RANGOS_POR_ENFOQUE.fuerza.peso)} repeticiones), ganar músculo (${rango(RANGOS_POR_ENFOQUE.hipertrofia.peso)}) o aguantar más (${rango(RANGOS_POR_ENFOQUE.resistencia.peso)}). Con tu cuerpo, las repeticiones son algo más altas.`,
        tipo: 'interactivo',
      },
      {
        objetivo: 'crear-metodo',
        titulo: 'Cómo repartes el peso',
        texto: `Si usas el mismo peso en todas las series o lo cambias de una a otra. Con tu cuerpo solo están ${metodosCalistenia.join(' y ')}.`,
        tipo: 'interactivo',
      },
      {
        objetivo: 'crear-referencia',
        titulo: 'Punto de partida',
        texto: 'Con peso, los kilos con los que empiezas. Con tu cuerpo, la versión que haces hoy (opcional).',
        tipo: 'interactivo',
      },
      {
        objetivo: 'crear-rango',
        titulo: 'Repeticiones objetivo',
        texto: `Primero subes repeticiones y después peso: con ${rango(RANGO_EJEMPLO)} repeticiones y ${kg(PESO_EJEMPLO)}, cuando hagas ${RANGO_EJEMPLO[1]} en todas las series subes a ${kg(PESO_EJEMPLO + incrementoPeso(PESO_EJEMPLO))} y vuelves a ${RANGO_EJEMPLO[0]}.`,
        tipo: 'interactivo',
      },
      {
        objetivo: 'crear-guia-rapida',
        titulo: 'Cómo funciona',
        texto: 'Si dudas, aquí está el resumen. Puedes cambiar todo después desde el ejercicio.',
        tipo: 'info',
      },
      {
        objetivo: 'crear-guardar',
        titulo: 'Guarda el ejercicio',
        texto: 'Al guardarlo te llevo a su primera medición, tu punto de partida.',
        tipo: 'navegacion',
        continua: 'prueba_inicial',
      },
    ],
  },
  prueba_inicial: {
    id: 'prueba_inicial',
    titulo: 'La primera medición',
    descripcion: 'Tu punto de partida y cómo anotar las series.',
    ruta: '/gym/ejercicios/:id/prueba',
    pasos: [
      {
        objetivo: 'prueba-instrucciones',
        titulo: 'Para qué sirve',
        texto: 'Anotas cuántas repeticiones logras hoy. Con eso la app sabe desde dónde empiezas y te dice qué hacer la próxima vez. Se hace una sola vez.',
        tipo: 'info',
      },
      {
        objetivo: 'series',
        titulo: 'Anota cada serie',
        texto: 'Por cada serie, las repeticiones que hiciste y el peso. Todas necesitan sus repeticiones.',
        tipo: 'interactivo',
      },
      {
        objetivo: 'serie-rir',
        titulo: 'Repeticiones que te quedaron (opcional)',
        texto: `Cuántas más podías hacer (RIR). Si llegas al máximo con ${RIR_SALTO_DOBLE} o más de sobra en todas, la app te propone subir el doble.`,
        tipo: 'interactivo',
      },
      {
        objetivo: 'series-agregar',
        titulo: 'Más series',
        texto: 'Agrega series, o una de calentamiento si la hiciste: esa no cuenta para tu progreso.',
        tipo: 'info',
      },
      {
        objetivo: 'series-guardar',
        titulo: 'Guarda la medición',
        texto: 'Al guardarla verás qué hacer la próxima vez.',
        tipo: 'navegacion',
        continua: 'detalle',
      },
    ],
  },
  detalle: {
    id: 'detalle',
    titulo: 'Qué hacer la próxima vez',
    descripcion: 'Tu siguiente paso, la recomendación y lo que has hecho.',
    ruta: '/gym/ejercicios/:id',
    pasos: [
      {
        objetivo: 'detalle-recomendacion',
        titulo: 'Tu próxima sesión',
        texto: `La app compara tu última sesión con tus repeticiones objetivo y te dice qué hacer: subir el peso (${kg(incrementoPeso(0))}, o ${kg(incrementoPeso(UMBRAL_PESO_ALTO_GRAMOS))} desde ${kg(UMBRAL_PESO_ALTO_GRAMOS)}), sumar repeticiones, repetir, bajar un ${Math.round(REDUCCION_DESCARGA * 100)} % para recuperarte o pasar a una versión más difícil. Debajo, el plan de cada serie.`,
        tipo: 'info',
      },
      {
        objetivo: 'detalle-1rm',
        titulo: 'Peso máximo estimado',
        texto: 'Una estimación del peso más alto que podrías levantar una sola vez (1RM), calculada con tus series. Si sube, estás progresando.',
        tipo: 'info',
      },
      {
        objetivo: 'detalle-historico',
        titulo: 'Lo que has hecho',
        texto: 'Todas tus sesiones de este ejercicio, la más reciente primero.',
        tipo: 'info',
      },
      {
        objetivo: ['detalle-mas-opciones', 'detalle-restaurar'],
        titulo: 'Más opciones',
        texto: 'Aquí cambias el objetivo y las repeticiones, o archivas el ejercicio: sale de tu lista y conserva todo lo que hiciste. Lo encuentras en Archivados y puedes restaurarlo cuando quieras.',
        tipo: 'info',
      },
      {
        objetivo: 'detalle-eliminar',
        titulo: 'Eliminar para siempre',
        texto: 'Borra el ejercicio con todas sus sesiones. No se puede deshacer y pide escribir su nombre: si dudas, mejor archívalo.',
        tipo: 'info',
      },
      {
        objetivo: 'detalle-registrar-sesion',
        titulo: 'Anota tu sesión',
        texto: 'Cuando entrenes, pulsa aquí y anota tus series. Para varios ejercicios a la vez, usa Entrenar hoy. Vamos a verlo.',
        tipo: 'navegacion',
        continua: 'sesion',
      },
    ],
  },
  sesion: {
    id: 'sesion',
    titulo: 'Anotar una sesión',
    descripcion: 'El plan ya puesto, los detalles de cada serie y la meta alcanzada.',
    ruta: '/gym/ejercicios/:id/sesion',
    pasos: [
      {
        objetivo: 'sesion-objetivo',
        titulo: 'Tu objetivo de hoy',
        texto: 'Lo que te toca hoy. El formulario ya viene con esos pesos.',
        tipo: 'info',
      },
      {
        objetivo: 'series',
        titulo: 'Ajusta lo que cambió',
        texto: 'Escribe las repeticiones que hiciste y corrige el peso si usaste otro.',
        tipo: 'interactivo',
      },
      {
        objetivo: 'serie-tecnica',
        titulo: 'Cómo hiciste la serie',
        texto: `Casi siempre es normal. Si hiciste algo especial (${tecnicas.join(', ')}), elígelo y verás cómo anotarlo.`,
        tipo: 'interactivo',
      },
      {
        objetivo: 'series-guardar',
        titulo: '¡Meta alcanzada!',
        texto: 'Al guardar, si llegaste al máximo de repeticiones en todas las series, verás el aviso "¡Meta alcanzada!" con lo que te toca la próxima vez.',
        tipo: 'info',
      },
      {
        objetivo: null,
        titulo: '¡Ya conoces Gym Assistant!',
        texto: 'Anota tus sesiones y la app te dirá cuándo subir. Puedes repetir la guía desde el botón Guía.',
        tipo: 'info',
        enlaces: [
          { texto: 'Ir a Entrenar hoy', href: '/gym/entrenamiento' },
          { texto: 'Hablar con CHRONO', href: '/gym/chat' },
        ],
      },
    ],
  },
};
