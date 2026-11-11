'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Boton } from '@/components/ui/Boton';
import { posicionarBurbuja, type Rectangulo } from '@/lib/guia/posicion';
import type { TipoPaso } from '@/lib/guia/recorridos';

const ANCHO_MOVIL = 640; // por debajo, la burbuja es una hoja fija abajo
const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface PropiedadesBurbuja {
  titulo: string;
  texto: string;
  numero: number;
  total: number;
  tipo: TipoPaso;
  hueco: Rectangulo | null;
  objetivo: HTMLElement | null;
  condicionCumplida: boolean;
  puedeAnterior: boolean;
  esUltimo: boolean;
  enlaces?: { texto: string; href: string }[] | undefined;
  onAnterior: () => void;
  onSiguiente: () => void;
  onSaltar: () => void;
  onPausar: () => void;
}

const escribiendo = (elemento: Element | null) =>
  elemento instanceof HTMLElement &&
  (elemento.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(elemento.tagName));

export function BurbujaGuia({
  titulo,
  texto,
  numero,
  total,
  tipo,
  hueco,
  objetivo,
  condicionCumplida,
  puedeAnterior,
  esUltimo,
  enlaces,
  onAnterior,
  onSiguiente,
  onSaltar,
  onPausar,
}: PropiedadesBurbuja) {
  const reducir = useReducedMotion() ?? false;
  const idTitulo = useId();
  const idTexto = useId();
  const caja = useRef<HTMLDivElement>(null);
  const [posicion, setPosicion] = useState<{ top: number; left: number } | null>(null);
  const [movil, setMovil] = useState(false);
  const navegacion = tipo === 'navegacion';
  const puedeSiguiente = condicionCumplida;

  // Posición: junto al hueco, cambiando de lado si no cabe; en pantallas angostas, hoja abajo.
  useLayoutEffect(() => {
    const ancho = window.innerWidth;
    setMovil(ancho < ANCHO_MOVIL);
    if (ancho < ANCHO_MOVIL || !caja.current) return;
    const { width, height } = caja.current.getBoundingClientRect();
    const { top, left } = posicionarBurbuja(hueco, { ancho: width, alto: height }, { ancho, alto: window.innerHeight });
    setPosicion({ top, left });
  }, [hueco, titulo]);

  // Foco: en pasos interactivos va al campo resaltado; en los demás, a la burbuja.
  useEffect(() => {
    const campo = tipo === 'interactivo' ? objetivo?.querySelector<HTMLElement>(ENFOCABLES) ?? null : null;
    (campo ?? caja.current)?.focus({ preventScroll: true });
  }, [titulo, tipo, objetivo]);

  // Teclado: ← y → para moverse, Esc para pausar, Tab dentro de la burbuja y del elemento resaltado.
  const acciones = useRef({ onAnterior, onSiguiente, onPausar, puedeSiguiente, puedeAnterior, navegacion });
  acciones.current = { onAnterior, onSiguiente, onPausar, puedeSiguiente, puedeAnterior, navegacion };
  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      const actual = acciones.current;
      if (evento.key === 'Escape') {
        evento.preventDefault();
        actual.onPausar();
        return;
      }
      if (evento.key === 'ArrowRight' && !escribiendo(document.activeElement)) {
        if (actual.puedeSiguiente && !actual.navegacion) actual.onSiguiente();
        return;
      }
      if (evento.key === 'ArrowLeft' && !escribiendo(document.activeElement)) {
        if (actual.puedeAnterior) actual.onAnterior();
        return;
      }
      if (evento.key !== 'Tab' || !caja.current) return;
      const zonas = [caja.current, ...(tipo !== 'info' && objetivo ? [objetivo] : [])];
      const enfocables = zonas.flatMap((zona) => [
        ...(zona.matches(ENFOCABLES) ? [zona] : []),
        ...Array.from(zona.querySelectorAll<HTMLElement>(ENFOCABLES)),
      ]);
      const primero = enfocables[0];
      const ultimo = enfocables.at(-1);
      if (!primero || !ultimo) return;
      const activo = document.activeElement as HTMLElement | null;
      const dentro = activo !== null && enfocables.includes(activo);
      if (evento.shiftKey && (activo === primero || !dentro)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && (activo === ultimo || !dentro)) {
        evento.preventDefault();
        primero.focus();
      }
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [tipo, objetivo]);

  const estilo = movil
    ? {}
    : posicion
      ? { top: posicion.top, left: posicion.left }
      : { top: -9999, left: -9999 }; // se mide fuera de la pantalla antes de ubicarla

  return (
    <motion.div
      ref={caja}
      role="dialog"
      aria-modal="false"
      aria-labelledby={idTitulo}
      aria-describedby={idTexto}
      tabIndex={-1}
      initial={reducir ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducir ? 0 : 0.18 }}
      style={estilo}
      className={`pointer-events-auto fixed z-[71] bg-superficie text-texto shadow-soft outline-none ${
        movil
          ? 'inset-x-0 bottom-0 max-h-[60dvh] overflow-y-auto rounded-t-2xl border-t border-borde p-4 pb-[max(1rem,env(safe-area-inset-bottom))]'
          : 'w-[22rem] max-w-[calc(100vw-1.5rem)] rounded-gym border border-borde p-4'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-primario">
        Paso {numero} de {total}
      </p>
      <h2 id={idTitulo} className="mt-1 text-base font-bold">
        {titulo}
      </h2>
      <p id={idTexto} aria-live="polite" className="mt-1 text-sm leading-relaxed text-texto-suave">
        {texto}
      </p>
      {navegacion ? (
        <p className="mt-2 text-sm font-medium text-texto">Pulsa el elemento resaltado para seguir.</p>
      ) : null}
      {tipo === 'interactivo' && !condicionCumplida ? (
        <p className="mt-2 text-sm font-medium text-texto">Completa el campo resaltado para seguir.</p>
      ) : null}
      {enlaces?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {enlaces.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href as Route}
              onClick={onSiguiente}
              className="rounded-gym border border-borde px-3 py-1.5 text-sm font-semibold text-primario hover:bg-primario-suave"
            >
              {enlace.texto}
            </Link>
          ))}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onSaltar}
          className="rounded px-1 text-sm text-texto-suave underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
        >
          Saltar guía
        </button>
        <div className="flex gap-2">
          <Boton variante="secundario" disabled={!puedeAnterior} onClick={onAnterior}>
            Anterior
          </Boton>
          {navegacion ? null : (
            <Boton disabled={!puedeSiguiente} onClick={onSiguiente}>
              {esUltimo ? 'Terminar' : 'Siguiente'}
            </Boton>
          )}
        </div>
      </div>
    </motion.div>
  );
}
