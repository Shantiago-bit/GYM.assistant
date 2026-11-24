'use client';

import { useEffect, useState } from 'react';
import { Icono, type NombreIcono } from '@/components/ui/Icono';
import { CLAVE_MUSEO_VISTO, SALAS_MUSEO } from '@/lib/reglas/museo';

const CLASES_FOCO =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario';

// El recorrido por las salas: en móvil, chips fijos arriba; en escritorio, un índice lateral fijo. La sala que se
// está viendo se marca con aria-current="location". Además, la visita apaga la insignia "Nuevo" del Pórtico.
export function IndiceSalas() {
  const [actual, setActual] = useState<string>(SALAS_MUSEO[0].id);

  useEffect(() => {
    try {
      window.localStorage.setItem(CLAVE_MUSEO_VISTO, '1');
    } catch {
      // Sin almacenamiento la insignia sigue: no pasa nada.
    }
    window.dispatchEvent(new Event('agon:museo-visto'));
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const observador = new IntersectionObserver(
      (entradas) => {
        const visible = entradas.filter((entrada) => entrada.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActual(visible.target.id);
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    for (const sala of SALAS_MUSEO) {
      const elemento = document.getElementById(sala.id);
      if (elemento) observador.observe(elemento);
    }
    return () => observador.disconnect();
  }, []);

  const enlaces = (variante: 'chip' | 'lateral') =>
    SALAS_MUSEO.map((sala) => (
      <li key={sala.id}>
        <a
          href={`#${sala.id}`}
          aria-current={actual === sala.id ? 'location' : undefined}
          onClick={() => setActual(sala.id)}
          className={
            variante === 'chip'
              ? `inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border border-borde bg-superficie px-3 text-sm font-semibold text-texto aria-[current=location]:border-primario aria-[current=location]:bg-primario-suave ${CLASES_FOCO}`
              : `flex min-h-11 items-center gap-2 rounded-boton px-3 text-sm font-semibold text-texto-suave hover:text-texto aria-[current=location]:bg-primario-suave aria-[current=location]:text-texto ${CLASES_FOCO}`
          }
        >
          <Icono nombre={sala.icono as NombreIcono} className="h-4 w-4 shrink-0" />
          {variante === 'chip' ? sala.corto : sala.titulo}
        </a>
      </li>
    ));

  return (
    <>
      <nav aria-label="Salas del museo" className="velo-cielo sticky top-14 z-20 -mx-4 mb-4 px-4 py-2 lg:hidden">
        <ul className="flex gap-2 overflow-x-auto">{enlaces('chip')}</ul>
      </nav>
      <nav aria-label="Índice del museo" className="hidden lg:block">
        <ul className="sticky top-28 space-y-1">{enlaces('lateral')}</ul>
      </nav>
    </>
  );
}
