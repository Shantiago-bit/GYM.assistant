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

// ---------- Sistema expresivo (nivel "Completas") ----------
// Las variantes de arriba siguen siendo las del nivel "Suaves"; las de abajo, más visibles, son las de
// "Completas". Los componentes eligen con elegirVariantes(nivel, suaves, expresivas). En "Mínimas", framer-motion
// solo anima la opacidad (MotionConfig reducedMotion="always" en ProveedorMovimiento).
export const DURACION_EXPRESIVA = { rapida: 0.35, base: 0.45, lenta: 0.6 } as const; // segundos
export const DESPLAZAMIENTO_EXPRESIVO = { corto: 24, largo: 32 } as const; // px
export const RESORTE_REBOTE: Transition = { type: 'spring', stiffness: 320, damping: 18 };
export const ESCALONADO_EXPRESIVO_SEGUNDOS = 0.08;
export const ESCALA_ENTRADA = 0.92;

export const entrarConRebote: Variants = {
  oculto: { opacity: 0, y: DESPLAZAMIENTO_EXPRESIVO.corto, scale: ESCALA_ENTRADA },
  visible: { opacity: 1, y: 0, scale: 1, transition: RESORTE_REBOTE },
};

export const revelarDesdeAbajo: Variants = {
  oculto: { opacity: 0, y: DESPLAZAMIENTO_EXPRESIVO.largo, clipPath: 'inset(100% 0% 0% 0%)' },
  visible: {
    opacity: 1,
    y: 0,
    clipPath: 'inset(0% 0% 0% 0%)',
    transition: { duration: DURACION_EXPRESIVA.lenta, ease: CURVA_SALIDA },
  },
};

export const girarEntrar: Variants = {
  oculto: { opacity: 0, rotateX: 12, transformPerspective: 800, y: DESPLAZAMIENTO_EXPRESIVO.corto / 2 },
  visible: { opacity: 1, rotateX: 0, transformPerspective: 800, y: 0, transition: RESORTE_REBOTE },
};

export const latido: Variants = {
  quieto: { scale: 1 },
  latiendo: { scale: [1, 1.06, 1], transition: { duration: DURACION_EXPRESIVA.base, ease: 'easeInOut' } },
};

export const sacudida: Variants = {
  quieto: { x: 0 },
  sacudiendo: { x: [0, -6, 6, -4, 4, 0], transition: { duration: DURACION_EXPRESIVA.base } },
};

export const aparecerEscalonadoExpresivo: Variants = {
  oculto: {},
  visible: { transition: { staggerChildren: ESCALONADO_EXPRESIVO_SEGUNDOS } },
};

export function elegirVariantes<T>(nivel: 'completas' | 'suaves' | 'minimas', suaves: T, expresivas: T): T {
  return nivel === 'completas' ? expresivas : suaves;
}
