'use client';

import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { CURVA_SALIDA, DURACION } from '@/lib/movimiento';

// Notificación que se puede cerrar: al cerrarse se desvanece y su alto se pliega, así lo de abajo sube suave en
// lugar de saltar. Con movimiento reducido, se quita al instante.
export function Cerrable({ visible, children }: { visible: boolean; children: ReactNode }) {
  const reducir = useReducedMotion() ?? false;
  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <m.div
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: reducir ? 0 : DURACION.base, ease: CURVA_SALIDA }}
          className="overflow-hidden"
        >
          {children}
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
