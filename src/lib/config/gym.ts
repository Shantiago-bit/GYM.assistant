export const RANGO_PESO: [number, number] = [8, 12];        // rango objetivo por defecto, peso (RN-05)
export const RANGO_CALISTENIA: [number, number] = [8, 15];  // rango objetivo por defecto, calistenia

// Rango sugerido según el enfoque; hipertrofia coincide con los rangos por defecto.
export const RANGOS_POR_ENFOQUE = {
  fuerza: { peso: [3, 5], calistenia: [3, 6] },
  hipertrofia: { peso: RANGO_PESO, calistenia: RANGO_CALISTENIA },
  resistencia: { peso: [15, 20], calistenia: [15, 25] },
} as const satisfies Record<string, Record<string, readonly [number, number]>>;

export const RIR_SALTO_DOBLE = 3;      // RIR mínimo en todas las series para duplicar el incremento
export const REDUCCION_DESCARGA = 0.1; // bajar 10 % tras dos sesiones seguidas bajo el mínimo
export const INCREMENTO_PESO_GRAMOS = 2500;                 // 2,5 kg (RN-06)
export const INCREMENTO_PESO_ALTO_GRAMOS = 5000;            // 5 kg desde el umbral (RN-06)
export const UMBRAL_PESO_ALTO_GRAMOS = 50000;               // 50 kg
export const ZONA_HORARIA = 'America/Bogota';
export const LIMITE_LISTADO = 500;
