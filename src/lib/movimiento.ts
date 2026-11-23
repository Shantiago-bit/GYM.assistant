// Sistema de movimiento de Agón: duraciones, curvas, distancias y variantes de framer-motion.
// Las entradas de página y las apariciones escalonadas usan las clases CSS de globals.css (.anim-entrada,
// .anim-escalonado), que funcionan sin JavaScript; framer-motion se reserva para lo que necesita estado
// (indicadores con layoutId, listas que se reordenan, contadores). Con "reducir movimiento", MotionConfig quita
// los desplazamientos y la regla global de CSS deja las animaciones en su estado final.
import type { Transition, Variants } from 'framer-motion';

export const DURACION = { rapida: 0.15, base: 0.25, lenta: 0.4 } as const; // segundos
export const CURVA_SALIDA = [0.22, 1, 0.36, 1] as const;
export const RESORTE_SUAVE: Transition = { type: 'spring', stiffness: 260, damping: 24 };
export const DESPLAZAMIENTO = 10; // px de la entrada (entre 8 y 12)
export const ESCALONADO_SEGUNDOS = 0.05;
export const ESCALONADO_MAXIMO = 8; // a partir del noveno hijo, sin retraso
export const DURACION_CONTADOR_MS = 600;
export const DURACION_CONFETI_MS = 1100;

const salida = (duracion: number = DURACION.base): Transition => ({ duration: duracion, ease: CURVA_SALIDA });

export const aparecer: Variants = {
  oculto: { opacity: 0, y: DESPLAZAMIENTO },
  visible: { opacity: 1, y: 0, transition: salida() },
};

export const desvanecer: Variants = {
  oculto: { opacity: 0 },
  visible: { opacity: 1, transition: salida(DURACION.rapida) },
  salida: { opacity: 0, transition: salida(DURACION.rapida) },
};

export const escalarSuave: Variants = {
  oculto: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: salida() },
  salida: { opacity: 0, transition: salida(DURACION.rapida) },
};

export const deslizarLateral: Variants = {
  oculto: { opacity: 0, x: -DESPLAZAMIENTO },
  visible: { opacity: 1, x: 0, transition: salida() },
};

// Contenedor escalonado: cada hijo usa `aparecer`; solo los primeros 8 esperan su turno.
export const aparecerEscalonado: Variants = {
  oculto: {},
  visible: { transition: { staggerChildren: ESCALONADO_SEGUNDOS } },
};

// Retraso del hijo `indice` en una aparición escalonada (0 a partir del noveno).
export function retrasoEscalonado(indice: number): number {
  return indice < ESCALONADO_MAXIMO ? Number((indice * ESCALONADO_SEGUNDOS).toFixed(2)) : 0;
}

// Curva del contador (sale rápido y frena al final), para t entre 0 y 1.
export function suavizarSalida(t: number): number {
  const limitado = Math.min(1, Math.max(0, t));
  return 1 - (1 - limitado) ** 3;
}

// Valor que muestra el contador a los `ms` milisegundos de empezar.
export function valorDelContador(final: number, ms: number, duracion: number = DURACION_CONTADOR_MS): number {
  if (duracion <= 0) return final;
  return Math.round(final * suavizarSalida(ms / duracion));
}
