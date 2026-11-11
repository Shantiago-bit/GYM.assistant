'use client';

import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { Boton } from '@/components/ui/Boton';

interface PropiedadesModal {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  // Elemento que recibe el foco al abrir (por ejemplo, el primer campo). Sin él, el foco va al panel.
  focoInicial?: RefObject<HTMLElement | null>;
}

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ titulo, onCerrar, children, focoInicial }: PropiedadesModal) {
  const idTitulo = useId();
  const panel = useRef<HTMLDivElement>(null);
  // Se guarda en una ref para que un onCerrar nuevo en cada render no vuelva a mover el foco.
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;

  useEffect(() => {
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (focoInicial?.current ?? panel.current)?.focus();

    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        cerrar.current();
        return;
      }
      // Tab y Shift+Tab dan la vuelta dentro del modal: el foco no sale a la página de fondo.
      if (evento.key !== 'Tab' || !panel.current) {
        return;
      }
      const enfocables = Array.from(panel.current.querySelectorAll<HTMLElement>(ENFOCABLES));
      const primero = enfocables[0];
      const ultimo = enfocables.at(-1);
      if (!primero || !ultimo) {
        evento.preventDefault();
        return;
      }
      const activo = document.activeElement;
      if (evento.shiftKey && (activo === primero || activo === panel.current)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && (activo === ultimo || !panel.current.contains(activo))) {
        evento.preventDefault();
        primero.focus();
      }
    };

    window.addEventListener('keydown', alPulsar);
    return () => {
      window.removeEventListener('keydown', alPulsar);
      // Al cerrar, el foco vuelve a donde estaba (por ejemplo, el botón que abrió el modal).
      if (anterior?.isConnected) {
        anterior.focus();
      }
    };
  }, [focoInicial]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-gym bg-superficie p-5 outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={idTitulo} className="text-lg font-semibold text-texto">
            {titulo}
          </h2>
          <Boton variante="fantasma" onClick={() => cerrar.current()} aria-label="Cerrar">
            Cerrar
          </Boton>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
