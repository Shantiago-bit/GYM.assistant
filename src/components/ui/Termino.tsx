'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { GLOSARIO, type IdTermino } from '@/lib/textos/glosario';

// Término técnico con un "?" que abre su explicación del glosario. Se abre y se cierra tocando el "?" (o con
// Enter o Espacio), y se cierra con Esc o tocando fuera. El área táctil del "?" es de 44 × 44 px aunque el
// círculo se vea pequeño. No va dentro de un <label>: tocarlo marcaría el campo.
export function Termino({ id, children }: { id: IdTermino; children?: ReactNode }) {
  const entrada = GLOSARIO[id];
  const [abierto, setAbierto] = useState(false);
  const idGlobo = useId();
  const contenedor = useRef<HTMLSpanElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alPulsarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        setAbierto(false);
        boton.current?.focus();
      }
    };
    const alTocarFuera = (evento: PointerEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false);
    };
    window.addEventListener('keydown', alPulsarTecla);
    window.addEventListener('pointerdown', alTocarFuera);
    return () => {
      window.removeEventListener('keydown', alPulsarTecla);
      window.removeEventListener('pointerdown', alTocarFuera);
    };
  }, [abierto]);

  return (
    <span ref={contenedor} className="relative inline-flex items-center">
      <span>{children ?? entrada.termino}</span>
      <button
        ref={boton}
        type="button"
        aria-expanded={abierto}
        aria-controls={idGlobo}
        aria-label={`¿Qué es ${entrada.termino}?`}
        onClick={() => setAbierto((valor) => !valor)}
        className="group -my-3 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none"
      >
        <span
          aria-hidden="true"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-primario text-xs font-bold text-primario group-hover:bg-primario-suave group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-primario"
        >
          ?
        </span>
      </button>
      <span
        id={idGlobo}
        role="note"
        hidden={!abierto}
        className="absolute left-0 top-full z-40 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-gym border border-borde bg-superficie p-3 text-left text-sm font-normal normal-case text-texto shadow-soft"
      >
        <span className="block font-semibold">
          {entrada.termino}
          {entrada.llano !== entrada.termino ? `: ${entrada.llano.toLowerCase()}` : ''}
        </span>
        <span className="mt-1 block">{entrada.explicacion}</span>
        <span className="mt-1 block text-texto-suave">Ejemplo: {entrada.ejemplo}</span>
      </span>
    </span>
  );
}
