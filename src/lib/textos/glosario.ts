// Glosario de los términos de entrenamiento que usa la app. Cada uno tiene:
// - termino: el nombre técnico (el que se ve en el modo avanzado y se guarda en la base);
// - llano: cómo se dice en el modo sencillo;
// - explicacion: una sola frase, la que abre el "?" de <Termino>;
// - ejemplo: un caso concreto.
// Los nombres guardados en la base no cambian: esto solo afecta lo que se muestra.

export interface EntradaGlosario {
  termino: string;
  llano: string;
  explicacion: string;
  ejemplo: string;
}

export const GLOSARIO = {
  repeticion: {
    termino: 'Repetición',
    llano: 'Repetición',
    explicacion: 'Una vez que haces el movimiento completo, de principio a fin.',
    ejemplo: 'Bajar y subir la barra una vez es una repetición.',
  },
  serie: {
    termino: 'Serie',
    llano: 'Serie',
    explicacion: 'Un grupo de repeticiones seguidas antes de descansar.',
    ejemplo: '3 series de 10 repeticiones: haces 10, descansas, y así tres veces.',
  },
  rango: {
    termino: 'Rango',
    llano: 'Repeticiones objetivo',
    explicacion: 'Cuántas repeticiones buscas hacer en cada serie, de un mínimo a un máximo.',
    ejemplo: 'Con 8 a 12, haces al menos 8 y, cuando llegas a 12 en todas las series, subes el peso.',
  },
  meta: {
    termino: 'Meta',
    llano: 'Repeticiones a buscar hoy',
    explicacion: 'Las repeticiones por serie que la app te propone para la próxima vez.',
    ejemplo: 'Meta 12: intenta hacer 12 repeticiones en cada serie.',
  },
  enfoque: {
    termino: 'Enfoque',
    llano: 'Objetivo del ejercicio',
    explicacion: 'Lo que buscas con el ejercicio; define cuántas repeticiones se proponen.',
    ejemplo: 'Ganar músculo propone de 8 a 12 repeticiones.',
  },
  hipertrofia: {
    termino: 'Hipertrofia',
    llano: 'Ganar músculo',
    explicacion: 'Entrenar con un número medio de repeticiones para que el músculo crezca.',
    ejemplo: 'De 8 a 12 repeticiones con un peso que te cueste.',
  },
  fuerza: {
    termino: 'Fuerza',
    llano: 'Ganar fuerza',
    explicacion: 'Pocas repeticiones con mucho peso para poder levantar más.',
    ejemplo: 'De 3 a 5 repeticiones con un peso alto.',
  },
  resistencia: {
    termino: 'Resistencia',
    llano: 'Aguantar más',
    explicacion: 'Muchas repeticiones con poco peso para cansarte menos.',
    ejemplo: 'De 15 a 20 repeticiones con un peso ligero.',
  },
  calistenia: {
    termino: 'Calistenia',
    llano: 'Con tu peso corporal',
    explicacion: 'Ejercicios sin pesas, en los que levantas tu propio cuerpo.',
    ejemplo: 'Flexiones, dominadas o sentadillas sin barra.',
  },
  variante: {
    termino: 'Variante',
    llano: 'Versión del ejercicio',
    explicacion: 'Una forma más fácil o más difícil del mismo ejercicio con tu cuerpo.',
    ejemplo: 'Flexiones con rodillas apoyadas es una variante más fácil que las flexiones normales.',
  },
  rir: {
    termino: 'RIR',
    llano: 'Repeticiones que te quedaron en reserva',
    explicacion: 'Cuántas repeticiones más podrías haber hecho con buena técnica al terminar la serie.',
    ejemplo: 'Si hiciste 10 y podías hacer 2 más, tu RIR es 2. Si no podías ni una más, es 0.',
  },
  unorm: {
    termino: '1RM',
    llano: 'Peso máximo estimado para 1 repetición',
    explicacion: 'Una estimación del peso más alto que podrías levantar una sola vez, calculada con tus series.',
    ejemplo: 'Si haces 10 repeticiones con 60 kg, tu 1RM estimado ronda los 80 kg.',
  },
  descarga: {
    termino: 'Descarga',
    llano: 'Semana más suave',
    explicacion: 'Bajar un poco el peso para recuperarte cuando dos veces seguidas no llegas al mínimo.',
    ejemplo: 'Pasas de 55 kg a 49,5 kg y la siguiente vez vuelves a subir.',
  },
  aproximacion: {
    termino: 'Aproximación',
    llano: 'Serie de calentamiento',
    explicacion: 'Una serie ligera antes de las de verdad; no cuenta para tu progreso.',
    ejemplo: 'Antes de 3 series con 60 kg, haces una de 10 repeticiones con 30 kg.',
  },
  prueba_inicial: {
    termino: 'Prueba inicial',
    llano: 'Primera medición',
    explicacion: 'La primera vez que anotas un ejercicio: así la app sabe desde dónde empiezas.',
    ejemplo: 'Hoy hiciste 3 series de 9 repeticiones con 40 kg: ese es tu punto de partida.',
  },
  metodo: {
    termino: 'Método de series',
    llano: 'Cómo repartes el peso',
    explicacion: 'Si usas el mismo peso en todas las series o lo cambias de una serie a otra.',
    ejemplo: 'Con series rectas haces las 3 series con el mismo peso.',
  },
  rectas: {
    termino: 'Series rectas',
    llano: 'Mismo peso en todas las series',
    explicacion: 'Todas las series con el mismo peso y buscando las mismas repeticiones.',
    ejemplo: '3 series de 8 a 12 repeticiones, todas con 50 kg.',
  },
  principal_descarga: {
    termino: 'Principal + descarga',
    llano: 'Una serie pesada y el resto más ligeras',
    explicacion: 'La primera serie es la pesada y las demás llevan un 10 % menos de peso.',
    ejemplo: 'Una serie con 60 kg y dos con 54 kg.',
  },
  piramide_invertida: {
    termino: 'Pirámide invertida',
    llano: 'De más pesado a más ligero',
    explicacion: 'Empiezas con la serie más pesada y en cada una bajas el peso y haces más repeticiones.',
    ejemplo: '60 kg × 8, después 54 kg × 10 y 48 kg × 12.',
  },
  piramide_ascendente: {
    termino: 'Pirámide ascendente',
    llano: 'De más ligero a más pesado',
    explicacion: 'Subes el peso en cada serie hasta terminar con la más pesada.',
    ejemplo: '48 kg, después 54 kg y al final 60 kg.',
  },
  cluster: {
    termino: 'Cluster',
    llano: 'Series en bloques con pausas cortas',
    explicacion: 'Cada serie se parte en bloques de 1 o 2 repeticiones con 15 a 30 segundos de pausa.',
    ejemplo: '2 repeticiones, pausa, 2 más, pausa… y anotas el total de la serie.',
  },
  tecnica: {
    termino: 'Técnica',
    llano: 'Cómo hiciste la serie',
    explicacion: 'Si la serie fue normal, de calentamiento o con una forma especial de llegar al cansancio.',
    ejemplo: 'Casi siempre es "Normal".',
  },
  amrap: {
    termino: 'AMRAP',
    llano: 'Todas las repeticiones que puedas',
    explicacion: 'Una serie en la que haces tantas repeticiones como puedas con buena técnica.',
    ejemplo: 'Con 40 kg haces 15 repeticiones hasta que ya no puedes más.',
  },
  rest_pause: {
    termino: 'Rest-pause',
    llano: 'Pausa corta y unas repeticiones más',
    explicacion: 'Al quedarte sin fuerzas descansas 10 a 20 segundos y haces 1 a 3 repeticiones más.',
    ejemplo: '10 repeticiones, pausa, 3 más, pausa, 2 más.',
  },
  myo_reps: {
    termino: 'Myo-reps',
    llano: 'Una serie larga y minis seguidas',
    explicacion: 'Una serie de 12 a 20 repeticiones y luego minis de 3 a 5 con muy poca pausa.',
    ejemplo: '15 repeticiones, y después 4, 4 y 3 con unas respiraciones entre medio.',
  },
  drop_set: {
    termino: 'Drop set',
    llano: 'Bajar el peso y seguir',
    explicacion: 'Al llegar al límite bajas el peso un 20 a 30 % y sigues sin descansar.',
    ejemplo: '8 repeticiones con 40 kg y, sin parar, 6 más con 30 kg.',
  },
  volumen: {
    termino: 'Volumen',
    llano: 'Peso total movido',
    explicacion: 'La suma del peso por las repeticiones de todas tus series.',
    ejemplo: '3 series de 10 con 50 kg son 1.500 kg.',
  },
  doble_progresion: {
    termino: 'Doble progresión',
    llano: 'Primero repeticiones, después peso',
    explicacion: 'Subes repeticiones con el mismo peso hasta el máximo y entonces subes el peso y vuelves al mínimo.',
    ejemplo: 'Con 8 a 12: llegas a 12 con 50 kg, pasas a 52,5 kg y vuelves a 8.',
  },
} as const satisfies Record<string, EntradaGlosario>;

export type IdTermino = keyof typeof GLOSARIO;

export function termino(id: IdTermino): EntradaGlosario {
  return GLOSARIO[id];
}

// En el modo sencillo se muestra el texto llano; en el avanzado, el término técnico.
export function nombreTermino(id: IdTermino, avanzado: boolean): string {
  return avanzado ? GLOSARIO[id].termino : GLOSARIO[id].llano;
}
