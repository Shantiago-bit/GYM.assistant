'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { clasesBoton } from '@/components/ui/Boton';

// Clases de cada opción del menú. Cada opción es un botón con role="menuitem" y tabIndex={-1}.
export const CLASES_OPCION_MENU =
  'flex min-h-11 w-full items-center rounded-gym px-3 py-2 text-left text-sm font-medium text-texto hover:bg-primario-suave focus:bg-primario-suave focus:outline-none';

const opcionesDe = (panel: HTMLElement | null) =>
  panel ? Array.from(panel.querySelectorAll<HTMLElement>('[role="menuitem"]')) : [];

// Botón "Más opciones" que abre un menú. Las opciones siguen montadas con el menú cerrado (solo se ocultan),
// así los modales que abren conservan su estado; los modales se pintan sobre document.body.
// Teclado: Enter, Espacio o flechas abren; flechas, Inicio y Fin se mueven; Esc cierra y vuelve al botón.
export function MenuMasOpciones({ etiqueta = 'Más opciones', children }: { etiqueta?: string; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const idMenu = useId();
  const boton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const contenedor = useRef<HTMLDivElement>(null);

  const enfocar = (indice: number) => {
    const lista = opcionesDe(panel.current);
    lista[(indice + lista.length) % lista.length]?.focus();
  };

  const abrir = (indice = 0) => {
    setAbierto(true);
    requestAnimationFrame(() => enfocar(indice));
  };

  const cerrar = (devolverFoco = true) => {
    setAbierto(false);
    if (devolverFoco) boton.current?.focus();
  };

  useEffect(() => {
    if (!abierto) return;
    const alTocarFuera = (evento: PointerEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false);
    };
    window.addEventListener('pointerdown', alTocarFuera);
    return () => window.removeEventListener('pointerdown', alTocarFuera);
  }, [abierto]);

  const teclasBoton = (evento: KeyboardEvent) => {
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      abrir(evento.key === 'ArrowDown' ? 0 : -1);
    }
  };

  const teclasMenu = (evento: KeyboardEvent) => {
    const actual = opcionesDe(panel.current).indexOf(document.activeElement as HTMLElement);
    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault();
        enfocar(actual + 1);
        break;
      case 'ArrowUp':
        evento.preventDefault();
        enfocar(actual - 1);
        break;
      case 'Home':
        evento.preventDefault();
        enfocar(0);
        break;
      case 'End':
        evento.preventDefault();
        enfocar(-1);
        break;
      case 'Escape':
        evento.preventDefault();
        cerrar();
        break;
      case 'Tab':
        cerrar(false);
        break;
    }
  };

  return (
    <div ref={contenedor} className="relative">
      <button
        ref={boton}
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={idMenu}
        onClick={() => (abierto ? cerrar(false) : abrir())}
        onKeyDown={teclasBoton}
        className={clasesBoton('secundario')}
      >
        {etiqueta}
        <span aria-hidden="true" className="ml-2">
          ▾
        </span>
      </button>
      <div
        ref={panel}
        id={idMenu}
        role="menu"
        aria-label={etiqueta}
        hidden={!abierto}
        onKeyDown={teclasMenu}
        // Al elegir una opción el menú se cierra y el foco vuelve al botón: así, al cerrar el modal que abre
        // la opción, el foco regresa a "Más opciones" y no a una opción oculta.
        onClick={(evento) => {
          if ((evento.target as HTMLElement).closest('[role="menuitem"]')) cerrar();
        }}
        className="absolute right-0 top-full z-40 mt-2 w-60 rounded-gym border border-borde bg-superficie p-1 shadow-soft"
      >
        {children}
      </div>
    </div>
  );
}
