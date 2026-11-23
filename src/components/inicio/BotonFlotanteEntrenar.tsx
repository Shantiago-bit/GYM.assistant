'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Solo en móvil: "Entrenar hoy" abajo a la derecha, por encima del contenido y del área segura de iOS. Se oculta
// al bajar y vuelve al subir (con movimiento reducido, sin desplazamiento: solo aparece y desaparece).
export function BotonFlotanteEntrenar() {
  const [oculto, setOculto] = useState(false);
  const ultimaPosicion = useRef(0);

  // Se monta en <body> con un portal: la plantilla de /gym anima la entrada con transform, y un ancestro con
  // transform deja de anclar los elementos fixed a la ventana.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  useEffect(() => {
    const alDesplazar = () => {
      const posicion = window.scrollY;
      const diferencia = posicion - ultimaPosicion.current;
      if (Math.abs(diferencia) < 8) return;
      setOculto(diferencia > 0 && posicion > 80);
      ultimaPosicion.current = posicion;
    };
    window.addEventListener('scroll', alDesplazar, { passive: true });
    return () => window.removeEventListener('scroll', alDesplazar);
  }, []);

  if (!montado) return null;

  // Dentro de un <nav>: montado en <body>, fuera del <main>, el botón también queda en una región.
  return createPortal(
    <nav aria-label="Acceso rápido" className="md:hidden">
      <Link
        href="/gym/entrenamiento"
        // Oculto sigue en el DOM, pero fuera del orden de tabulación.
        tabIndex={oculto ? -1 : undefined}
        aria-hidden={oculto ? true : undefined}
        className={`fixed right-4 z-30 inline-flex min-h-14 items-center gap-2 rounded-full bg-primario px-5 font-bold text-white shadow-elevada transition-[transform,opacity] duration-200 ease-out hover:bg-primario-fuerte active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario md:hidden ${
          oculto
            ? 'pointer-events-none translate-y-24 opacity-0 motion-reduce:translate-y-0'
            : 'translate-y-0 opacity-100'
        }`}
        style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 12h12M3 9v6M21 9v6M6 7v10M18 7v10" />
        </svg>
        Entrenar hoy
      </Link>
    </nav>,
    document.body,
  );
}
