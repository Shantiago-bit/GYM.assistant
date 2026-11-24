// La llama de la racha: cuánto arde según los días de racha. Función pura (src/components/movimiento/Llama.tsx).
// - 0 días: brasa apagada, gris, sin chispas.
// - 1 a 2: llama pequeña.  3 a 6: media, con chispas.  7 o más: grande, con un halo que respira.
// - 30 o más: color especial (ámbar y ciruela) y más chispas.
// En riesgo (hoy es día planificado, no ha entrenado y ya pasó el mediodía): un poco más baja.
export type IntensidadLlama = 'brasa' | 'pequena' | 'media' | 'grande' | 'legendaria';

export interface EstadoLlama {
  intensidad: IntensidadLlama;
  chispas: number;
  halo: boolean;
  escala: number; // tamaño de la llama dentro de su caja (0 a 1)
}

const BASE: Record<IntensidadLlama, Omit<EstadoLlama, 'intensidad'>> = {
  brasa: { chispas: 0, halo: false, escala: 0.45 },
  pequena: { chispas: 0, halo: false, escala: 0.7 },
  media: { chispas: 3, halo: false, escala: 0.85 },
  grande: { chispas: 4, halo: true, escala: 1 },
  legendaria: { chispas: 5, halo: true, escala: 1 },
};

export function intensidadDeRacha(racha: number): IntensidadLlama {
  if (racha >= 30) return 'legendaria';
  if (racha >= 7) return 'grande';
  if (racha >= 3) return 'media';
  if (racha >= 1) return 'pequena';
  return 'brasa';
}

export function estadoLlama(racha: number, enRiesgo = false): EstadoLlama {
  const intensidad = intensidadDeRacha(Math.max(0, Math.floor(racha)));
  const base = BASE[intensidad];
  return { intensidad, ...base, escala: enRiesgo && intensidad !== 'brasa' ? Math.round(base.escala * 0.85 * 100) / 100 : base.escala };
}

// Hoy es día planificado, todavía no entrenó y ya pasó el mediodía (hora de Bogotá): la racha está en riesgo.
export function rachaEnRiesgo(d: { racha: number; hoyEsDescanso: boolean; entrenoHoy: boolean; hora: number }): boolean {
  return d.racha > 0 && !d.hoyEsDescanso && !d.entrenoHoy && d.hora >= 12;
}

export function etiquetaLlama(racha: number): string {
  if (racha <= 0) return 'Racha apagada: entrena para encenderla';
  return `Racha de ${racha} ${racha === 1 ? 'día' : 'días'}`;
}
