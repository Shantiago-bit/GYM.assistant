'use client';

import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { Confeti } from '@/components/ui/Movimiento';
import { useState } from 'react';
import { Icono } from '@/components/ui/Icono';
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
        <m.section
          aria-label="Feliz cumpleaños"
          // relative: el confeti se ubica dentro de la tarjeta.
          style={{ position: 'relative' }}
          initial={reducir ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
          animate={reducir ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          // Al cerrarse también se pliega su alto (y su margen), para que lo de abajo suba sin saltar.
          exit={reducir ? { opacity: 0 } : { opacity: 0, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0, scale: 0.98 }}
          transition={{ duration: reducir ? 0.15 : 0.35, ease: 'easeOut' }}
          className="relative mb-5 overflow-hidden rounded-gym border border-borde bg-primario-suave p-5 pr-12"
        >
          <Confeti />
          {!reducir ? (
            <m.span
              aria-hidden="true"
              className="absolute -right-1 -top-2 block select-none text-primario opacity-30"
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 1.6, repeat: 2, ease: 'easeInOut' }}
            >
              <Icono nombre="pastel" className="h-16 w-16" />
            </m.span>
          ) : null}
          <p className="flex items-center gap-2 text-lg font-bold text-texto">
            ¡Feliz cumpleaños, {nombre}! <Icono nombre="celebracion" className="h-5 w-5 text-primario" />
          </p>
          <p className="text-texto">Hoy cumples {edad} años.</p>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar la felicitación"
            className="absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-texto-suave hover:bg-superficie hover:text-texto focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
          >
            <Icono nombre="cerrar" />
          </button>
        </m.section>
      ) : null}
    </AnimatePresence>
  );
}
