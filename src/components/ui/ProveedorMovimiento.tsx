'use client';

import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

// Con "reducir movimiento" activo en el sistema, framer-motion no anima transformaciones ni posiciones.
export function ProveedorMovimiento({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
