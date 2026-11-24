import type { EstadoHoy, Sugerencia } from '@/lib/chat/sugerencias';

// Lo que el panel "Lo que sé de ti" muestra en lenguaje claro: los mismos datos que CHRONO recibe como contexto
// (nombre, días, si hoy toca entrenar, ejercicios con su recomendación), más la racha, la constelación y el último
// récord que la persona ya ve en el inicio. Se arma en el servidor (src/app/gym/chat/page.tsx); al modelo no le
// llega nada nuevo.
export interface EjercicioContexto {
  id: string;
  nombre: string;
  frase: string; // la recomendación corta
}

export interface ContextoChat {
  apodo: string;
  saludo: string; // "Buenas tardes", según la hora de Bogotá
  dias: string[]; // ["lunes", "miércoles", "viernes"]
  estadoHoy: EstadoHoy;
  racha: number;
  constelacion: { nombre: string; encendidas: number; total: number } | null;
  ejercicios: EjercicioContexto[];
  record: { nombre: string; marca: string; fecha: string } | null;
  sugerencias: Sugerencia[];
}

export const TEXTO_HOY: Record<EstadoHoy, string> = {
  entrenar: 'Hoy toca entrenar',
  descanso: 'Hoy es día de descanso',
  entrenado: 'Hoy ya entrenaste',
};

// "lunes, miércoles y viernes"
export function listaDias(dias: string[]): string {
  if (dias.length === 0) return 'sin días elegidos';
  if (dias.length === 1) return dias[0]!;
  return `${dias.slice(0, -1).join(', ')} y ${dias.at(-1)}`;
}

export const textoRacha = (racha: number) => (racha === 1 ? '1 día' : `${racha} días`);
