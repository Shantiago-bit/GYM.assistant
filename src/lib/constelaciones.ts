// Las constelaciones del cielo del inicio, una por cada cantidad de días de entrenamiento a la semana (1 a 7).
// Son constelaciones reales con mito griego, SIMPLIFICADAS de forma artística: no son mapas astronómicos exactos
// (las posiciones, distancias y brillos se eligieron para que la figura se lea bien en pantalla).
// Coordenadas en un espacio de 100 × 92; las líneas unen índices de estrellas (desde 0).
export interface Constelacion {
  dias: number; // estrellas = días planificados a la semana
  nombre: string;
  mito: string; // una línea
  estrellas: readonly (readonly [number, number])[];
  lineas: readonly (readonly [number, number])[];
  anillos?: readonly number[]; // radios de los anillos de luz al encenderse (solo la Estrella Polar)
}

export const ANCHO_CIELO = 100;
export const ALTO_CIELO = 92;

export const CONSTELACIONES: Record<number, Constelacion> = {
  1: {
    dias: 1,
    nombre: 'Estrella Polar',
    mito: 'La estrella que guiaba a los navegantes griegos.',
    estrellas: [[50, 50]],
    lineas: [],
    anillos: [16, 24],
  },
  2: {
    dias: 2,
    nombre: 'Cástor y Pólux',
    mito: 'Los Dioscuros, gemelos inseparables: Pólux era boxeador y Cástor, jinete.',
    estrellas: [
      [36, 38],
      [64, 58],
    ],
    lineas: [[0, 1]],
  },
  3: {
    dias: 3,
    nombre: 'Cinturón de Orión',
    mito: 'El cinturón del gran cazador.',
    estrellas: [
      [26, 66],
      [50, 50],
      [74, 34],
    ],
    lineas: [
      [0, 1],
      [1, 2],
    ],
  },
  4: {
    dias: 4,
    nombre: 'Gran Cuadrado de Pegaso',
    mito: 'El caballo alado que nació de la sangre de Medusa.',
    estrellas: [
      [24, 26],
      [76, 22],
      [80, 74],
      [20, 78],
    ],
    lineas: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ],
  },
  5: {
    dias: 5,
    nombre: 'Casiopea',
    mito: 'La reina en su trono, condenada a girar alrededor del polo.',
    estrellas: [
      [8, 38],
      [29, 64],
      [50, 44],
      [71, 66],
      [92, 34],
    ],
    lineas: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  6: {
    dias: 6,
    nombre: 'La Lira',
    mito: 'La lira de Orfeo, cuya música conmovía hasta a las piedras.',
    estrellas: [
      [46, 10],
      [66, 18],
      [40, 36],
      [62, 42],
      [56, 84],
      [34, 78],
    ],
    lineas: [
      [0, 1],
      [0, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 2],
    ],
  },
  7: {
    dias: 7,
    nombre: 'Osa Mayor',
    mito: 'Calisto, convertida en osa y llevada al cielo por Zeus.',
    estrellas: [
      [6, 26],
      [22, 32],
      [37, 40],
      [50, 50],
      [52, 72],
      [80, 76],
      [84, 52],
    ],
    lineas: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 3],
    ],
  },
};

export function constelacionDe(dias: number): Constelacion {
  return CONSTELACIONES[Math.min(7, Math.max(1, Math.round(dias)))]!;
}
