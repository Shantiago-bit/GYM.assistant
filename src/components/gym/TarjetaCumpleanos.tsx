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
          {/* Globos que suben una vez al abrir el inicio el día del cumpleaños (solo "Completas"). */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-0">
            {[
              { x: '12%', color: 'var(--color-lavanda)', retardo: '0s', giro: '-6deg' },
              { x: '38%', color: 'var(--color-acento)', retardo: '0.35s', giro: '5deg' },
              { x: '64%', color: 'var(--color-primario)', retardo: '0.15s', giro: '-3deg' },
              { x: '84%', color: 'var(--color-aviso)', retardo: '0.5s', giro: '7deg' },
            ].map((globo) => (
              <svg
                key={globo.x}
                aria-hidden="true"
                viewBox="0 0 24 40"
                className="globo absolute bottom-0 h-10 w-6"
                style={{ left: globo.x, animationDelay: globo.retardo, ['--giro' as string]: globo.giro }}
              >
                <ellipse cx="12" cy="12" rx="10" ry="12" fill={globo.color} />
                <path d="M12 24c-1 4 2 8 0 16" stroke={globo.color} strokeWidth="1" fill="none" />
              </svg>
            ))}
          </span>
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
