'use client';

import { LazyMotion, MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

// Las funciones de animación (incluidas las de layout: layoutId y listas que se reordenan) se cargan aparte y sin
// bloquear: la página no pesa más por ellas. `strict` obliga a usar el componente `m` en lugar de `motion`.
const cargarFunciones = () => import('./funcionesMovimiento').then((modulo) => modulo.default);

// Con "reducir movimiento" activo en el sistema, framer-motion no anima transformaciones ni posiciones (solo la
// opacidad), y los componentes con contador o confeti muestran su estado final (usePrefiereMenosMovimiento).
export function ProveedorMovimiento({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={cargarFunciones} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
