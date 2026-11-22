'use client';

import { AnimatePresence, m } from 'framer-motion';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { RESORTE_SUAVE, desvanecer } from '@/lib/movimiento';

// Componentes con animaciones de layout (framer-motion): solo los importan las pantallas que los usan.
// Lista que se reordena con animación al cambiar el filtro; los elementos que entran o salen se desvanecen.
// Recibe cada elemento con su clave explícita (no recorre children: en una navegación del cliente, los
// componentes del servidor llegan como referencias que se cargan después).
export function ListaAnimada({
  elementos,
  className = '',
  guiaPrimero,
}: {
  elementos: { clave: string; contenido: ReactNode }[];
  className?: string;
  guiaPrimero?: string;
}) {
  return (
    <ul className={className}>
      <AnimatePresence initial={false} mode="popLayout">
        {elementos.map((elemento, indice) => (
          <m.li
            key={elemento.clave}
            layout
            variants={desvanecer}
            initial="oculto"
            animate="visible"
            exit="salida"
            transition={RESORTE_SUAVE}
            data-guia={indice === 0 ? guiaPrimero : undefined}
          >
            {elemento.contenido}
          </m.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

// Grupo de enlaces tipo segmento (Todos / Peso / Con tu cuerpo) con un indicador que se desliza a la opción activa.
export function SegmentoAnimado({
  etiqueta,
  opciones,
  idIndicador,
}: {
  etiqueta: string;
  idIndicador: string;
  opciones: { href: string; texto: string; activo: boolean }[];
}) {
  return (
    <nav aria-label={etiqueta} className="inline-flex rounded-boton border border-borde bg-superficie p-1">
      {opciones.map((opcion) => (
        <Link
          key={opcion.texto}
          href={opcion.href as Route}
          aria-current={opcion.activo ? 'page' : undefined}
          className="relative inline-flex min-h-11 items-center rounded-[9px] px-3 py-1.5 text-sm font-medium text-texto-suave transition-colors hover:text-texto aria-[current=page]:text-white"
        >
          {opcion.activo ? (
            <m.span layoutId={idIndicador} aria-hidden="true" className="absolute inset-0 rounded-[9px] bg-primario" transition={RESORTE_SUAVE} />
          ) : null}
          <span className="relative">{opcion.texto}</span>
        </Link>
      ))}
    </nav>
  );
}
