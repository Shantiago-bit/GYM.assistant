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
        texto: 'Aquí están todas las secciones: Ejercicios, Entrenamiento, Resumen, CHRONO (tu asistente) y tu perfil.',
        tipo: 'info',
      },
      {
        objetivo: 'nav-ejercicios',
        titulo: 'Ejercicios',
        texto: 'Tu lista de ejercicios. Cada uno muestra su peso actual, su rango y si ya te toca subir.',
        tipo: 'info',
      },
      {
        objetivo: 'nav-entrenamiento',
        titulo: 'Entrenamiento',
        texto: 'Registra varios ejercicios en una misma visita al gimnasio, como una rutina completa.',
        tipo: 'info',
      },
      {
        objetivo: 'nav-resumen',
        titulo: 'Resumen',
        texto: 'Elige un periodo y mira cuántas sesiones hiciste y cómo progresó cada ejercicio.',
        tipo: 'info',
      },
      {
        objetivo: 'nav-chrono',
        titulo: 'CHRONO',
        texto: `Tu asistente con IA: conoce tus datos, responde preguntas, arma rutinas y puede crear, modificar, archivar o restaurar ejercicios si se lo confirmas. Hasta ${CHAT_LIMITE_DIARIO} mensajes por día.`,
        tipo: 'info',
      },
      {
        objetivo: 'estadisticas',
        titulo: 'Tus números',
        texto: 'Ejercicios activos, sesiones registradas y cuántos están "Listos para subir" de peso.',
        tipo: 'info',
      },
      {
        objetivo: 'filtros',
        titulo: 'Filtros',
        texto: 'Filtra por tipo (peso o calistenia) y mira los activos o los archivados.',
        tipo: 'info',
      },
      {
        objetivo: 'tarjeta-ejercicio',
        titulo: 'Un ejercicio',
        texto: 'Desde aquí registras una sesión o abres el detalle con la recomendación y el histórico.',
        tipo: 'info',
      },
      {
        objetivo: 'menu-perfil',
        titulo: 'Tu perfil',
        texto: 'Tu perfil: tus datos, tu foto, tus récords y tu racha. En este menú también está la Guía, para repetir cada recorrido cuando quieras.',
        tipo: 'info',
      },
      {
        objetivo: 'nuevo-ejercicio',
        titulo: 'Crea tu primer ejercicio',
        texto: 'Vamos a crear tu primer ejercicio. Pulsa el botón y te acompaño en el formulario.',
        tipo: 'navegacion',
        continua: 'crear_ejercicio',
      },
    ],
  },
  crear_ejercicio: {
    id: 'crear_ejercicio',
    titulo: 'Crear un ejercicio',
    descripcion: 'Cada campo del formulario y cómo progresa.',
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
        titulo: 'Tipo',
        texto: 'Peso: con barra, mancuernas o máquina; al progresar sube el peso. Calistenia: con tu cuerpo; en lugar de subir peso pasas a una variante más difícil.',
        tipo: 'interactivo',
      },
      {
        objetivo: 'crear-enfoque',
        titulo: 'Enfoque',
        texto: `Fuerza (${rango(RANGOS_POR_ENFOQUE.fuerza.peso)} reps), hipertrofia (${rango(RANGOS_POR_ENFOQUE.hipertrofia.peso)}) o resistencia (${rango(RANGOS_POR_ENFOQUE.resistencia.peso)}). Al elegirlo, la app propone el rango; en calistenia los rangos son algo más altos.`,
        tipo: 'interactivo',
      },
      {
        objetivo: 'crear-metodo',
        titulo: 'Método de series',
        texto: `Define cómo se reparte el peso y qué serie decide la progresión. En calistenia solo están ${metodosCalistenia.join(' y ')}.`,
        tipo: 'interactivo',
      },
      {
        objetivo: 'crear-referencia',
        titulo: 'Punto de partida',
        texto: 'En peso, el kilaje con el que empiezas. En calistenia, la variante que haces hoy (opcional).',
        tipo: 'interactivo',
      },
      {
        objetivo: 'crear-rango',
        titulo: 'Rango objetivo',
        texto: `Doble progresión: con rango ${rango(RANGO_EJEMPLO)} y ${kg(PESO_EJEMPLO)}, cuando hagas ${RANGO_EJEMPLO[1]} reps en todas las series subes a ${kg(PESO_EJEMPLO + incrementoPeso(PESO_EJEMPLO))} y vuelves a ${RANGO_EJEMPLO[0]}.`,
        tipo: 'interactivo',
      },
      {
        objetivo: 'crear-guia-rapida',
        titulo: 'Guía rápida',
        texto: 'Si dudas, aquí tienes los enfoques y métodos explicados. Puedes cambiarlos después desde el detalle.',
        tipo: 'info',
      },
      {
        objetivo: 'crear-guardar',
        titulo: 'Guarda el ejercicio',
        texto: 'Al guardarlo te llevo a su prueba inicial, tu punto de partida.',
        tipo: 'navegacion',
        continua: 'prueba_inicial',
      },
    ],
  },
  prueba_inicial: {
    id: 'prueba_inicial',
    titulo: 'La prueba inicial',
    descripcion: 'Tu punto de partida y cómo anotar las series.',
    ruta: '/gym/ejercicios/:id/prueba',
    pasos: [
      {
        objetivo: 'prueba-instrucciones',
        titulo: 'Para qué sirve',
        texto: 'Es tu primera medición: con ella la app conoce tu nivel real y calcula la primera recomendación. Se hace una sola vez.',
        tipo: 'info',
      },
      {
        objetivo: 'series',
        titulo: 'Anota cada serie',
        texto: 'Por cada serie, las repeticiones que hiciste y el peso. Puedes completarlas ahora: todas necesitan sus repeticiones.',
        tipo: 'interactivo',
      },
      {
        objetivo: 'serie-rir',
        titulo: 'RIR (opcional)',
        texto: `Cuántas repeticiones más podías hacer. Si llegas al tope del rango con RIR ${RIR_SALTO_DOBLE} o más en todas, la app sugiere un salto de peso doble.`,
        tipo: 'interactivo',
      },
      {
        objetivo: 'series-agregar',
        titulo: 'Más series',
        texto: 'Agrega series o una de aproximación para el calentamiento, que no cuenta para la progresión.',
        tipo: 'info',
      },
      {
        objetivo: 'series-guardar',
        titulo: 'Guarda la prueba',
        texto: 'Al guardarla verás la recomendación para tu próxima sesión.',
        tipo: 'navegacion',
        continua: 'detalle',
      },
    ],
  },
  detalle: {
    id: 'detalle',
    titulo: 'La recomendación',
    descripcion: 'Qué hacer en la próxima sesión, el histórico y el 1RM.',
    ruta: '/gym/ejercicios/:id',
    pasos: [
      {
        objetivo: 'detalle-recomendacion',
        titulo: 'Tu próxima sesión',
        texto: `La app compara tu última sesión con el rango: subir peso (${kg(incrementoPeso(0))}, o ${kg(incrementoPeso(UMBRAL_PESO_ALTO_GRAMOS))} desde ${kg(UMBRAL_PESO_ALTO_GRAMOS)}), subir repeticiones, mantener, descarga (−${Math.round(REDUCCION_DESCARGA * 100)} %) o variante más difícil. Debajo, el plan por serie.`,
        tipo: 'info',
      },
      {
        objetivo: 'detalle-1rm',
        titulo: '1RM estimado',
        texto: 'Una estimación del peso máximo que podrías levantar una vez, calculada con tus series. Sube cuando progresas.',
        tipo: 'info',
      },
      {
        objetivo: 'detalle-historico',
        titulo: 'Histórico',
        texto: 'Todas tus sesiones de este ejercicio, la más reciente primero.',
        tipo: 'info',
      },
      {
        objetivo: ['detalle-archivar', 'detalle-restaurar'],
        titulo: 'Archivar o restaurar',
        texto: 'Archivar saca el ejercicio de tu lista y conserva todo su histórico. Lo encuentras en el filtro Archivados y puedes restaurarlo cuando quieras.',
        tipo: 'info',
      },
      {
        objetivo: 'detalle-eliminar',
        titulo: 'Eliminar para siempre',
        texto: 'Aquí puedes borrar el ejercicio con todas sus sesiones. No se puede deshacer y pide escribir su nombre: si dudas, mejor archívalo.',
        tipo: 'info',
      },
      {
        objetivo: 'detalle-registrar-sesion',
        titulo: 'Registra tu sesión',
        texto: 'Cuando entrenes, pulsa aquí y anota tus series. Vamos a verlo.',
        tipo: 'navegacion',
        continua: 'sesion',
      },
    ],
  },
  sesion: {
    id: 'sesion',
    titulo: 'Registrar una sesión',
    descripcion: 'El plan precargado, las técnicas y la meta alcanzada.',
    ruta: '/gym/ejercicios/:id/sesion',
    pasos: [
      {
        objetivo: 'sesion-objetivo',
        titulo: 'Tu objetivo de hoy',
        texto: 'El plan de la app para esta sesión. El formulario ya viene precargado con esos pesos.',
        tipo: 'info',
      },
      {
        objetivo: 'series',
        titulo: 'Ajusta lo que cambió',
        texto: 'Anota las repeticiones y corrige el peso que hiciste de verdad en cada serie.',
        tipo: 'interactivo',
      },
      {
        objetivo: 'serie-tecnica',
        titulo: 'Técnica de la serie',
        texto: `Además de normal: ${tecnicas.join(', ')}. Al elegir una, verás cómo anotarla.`,
        tipo: 'interactivo',
      },
      {
        objetivo: 'series-guardar',
        titulo: '¡Meta alcanzada!',
        texto: 'Al guardar, si llegaste al tope del rango, verás el aviso "¡Meta alcanzada!" con tu próxima rutina.',
        tipo: 'info',
      },
      {
        objetivo: null,
        titulo: '¡Ya conoces Gym Assistant!',
        texto: 'Registra tus sesiones y la app te dirá cuándo subir. Puedes repetir la guía desde el botón Guía.',
        tipo: 'info',
        enlaces: [
          { texto: 'Ir a Entrenamiento', href: '/gym/entrenamiento' },
          { texto: 'Hablar con CHRONO', href: '/gym/chat' },
        ],
      },
    ],
  },
};
