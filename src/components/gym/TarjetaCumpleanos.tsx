'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { enviarJson } from '@/lib/http/cliente';

// Se muestra el día del cumpleaños hasta que la persona la cierra; luego no vuelve hasta el año siguiente.
export function TarjetaCumpleanos({ nombre, edad }: { nombre: string; edad: number }) {
  const reducir = useReducedMotion() ?? false;
  const [visible, setVisible] = useState(true);

  const cerrar = () => {
    setVisible(false);
    void enviarJson('/api/gym/perfil/cumple');
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.section
          aria-label="Feliz cumpleaños"
          initial={reducir ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
          animate={reducir ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reducir ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: reducir ? 0.15 : 0.35, ease: 'easeOut' }}
          className="relative mb-5 overflow-hidden rounded-gym border border-borde bg-primario-suave p-5 pr-12"
        >
          {!reducir ? (
            <motion.span
              aria-hidden="true"
              className="absolute -right-2 -top-3 select-none text-6xl opacity-30"
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 1.6, repeat: 2, ease: 'easeInOut' }}
            >
              🎂
            </motion.span>
          ) : null}
          <p className="text-lg font-bold text-texto">
            ¡Feliz cumpleaños, {nombre}! <span aria-hidden="true">🎉</span>
          </p>
          <p className="text-texto">Hoy cumples {edad} años.</p>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar la felicitación"
            className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-lg leading-none text-texto-suave hover:bg-superficie hover:text-texto focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
          >
            ×
          </button>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
