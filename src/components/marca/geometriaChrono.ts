// Geometría del símbolo de CHRONO, copiada tal cual de Doc/marca/chrono/chrono-simbolo.svg (viewBox 0 0 64 64):
// corona de laurel alrededor de la letra griega Χ, con un trazo grueso y uno fino y remates. La usan el símbolo
// (SimboloChrono) y la intro (IntroChrono). El laurel con la Χ es solo de CHRONO; el escudo con la barra, de Agón.
export const HOJA = 'M0 0C2.3-2.2 5.8-2.3 8.4 0C5.8 2.3 2.3 2.2 0 0Z';

export const RAMA_IZQUIERDA = 'M25 55C13 48 9 31 16 14';
export const RAMA_DERECHA = 'M39 55C51 48 55 31 48 14';

// [x, y, rotación, escala] de cada hoja.
export type Hoja = readonly [number, number, number, number];
export const HOJAS_IZQUIERDA: readonly Hoja[] = [
  [21.64, 52.61, -177.4, 1.05],
  [17.78, 48.37, -163.4, 1.0],
  [14.95, 43.24, -150.6, 0.96],
  [13.93, 40.39, -66.7, 0.72],
  [13.19, 37.37, -139.0, 0.91],
  [12.56, 30.95, -128.5, 0.87],
  [12.61, 28.55, -46.9, 0.72],
  [13.1, 24.12, -118.7, 0.82],
  [16.0, 14.0, -67.6, 0.82],
];
export const HOJAS_DERECHA: readonly Hoja[] = [
  [42.36, 52.61, 357.4, 1.05],
  [46.22, 48.37, 343.4, 1.0],
  [49.05, 43.24, 330.6, 0.96],
  [50.07, 40.39, 246.7, 0.72],
  [50.81, 37.37, 319.0, 0.91],
  [51.44, 30.95, 308.5, 0.87],
  [51.39, 28.55, 226.9, 0.72],
  [50.9, 24.12, 298.7, 0.82],
  [48.0, 14.0, 247.6, 0.82],
];
export const transformarHoja = ([x, y, r, s]: Hoja) => `translate(${x} ${y}) rotate(${r}) scale(${s})`;

// La Χ: el trazo grueso (de arriba a la izquierda hacia abajo a la derecha) y el fino, cada uno con sus remates.
export const CHI_GRUESO = {
  trazo: 'M20.42 21.2H26.3L43.58 42.8H37.7Z',
  remates: [
    { x: 18.6, y: 20.2, width: 9.5, height: 1.7, rx: 0.4 },
    { x: 35.9, y: 42.1, width: 9.5, height: 1.7, rx: 0.4 },
  ],
} as const;
export const CHI_FINO = {
  trazo: 'M39.49 21.2H41.79L24.51 42.8H22.21Z',
  remates: [
    { x: 36.6, y: 20.2, width: 8.1, height: 1.7, rx: 0.4 },
    { x: 19.3, y: 42.1, width: 8.1, height: 1.7, rx: 0.4 },
  ],
} as const;
