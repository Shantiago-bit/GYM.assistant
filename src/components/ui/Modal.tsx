'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Boton } from '@/components/ui/Boton';

interface PropiedadesModal {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}

export function Modal({ titulo, onCerrar, children }: PropiedadesModal) {
  const idTitulo = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.focus();

    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        onCerrar();
      }
    };

    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="w-full max-w-md rounded-gym bg-superficie p-5 outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={idTitulo} className="text-lg font-semibold text-texto">
            {titulo}
          </h2>
          <Boton variante="fantasma" onClick={onCerrar} aria-label="Cerrar">
            Cerrar
          </Boton>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
