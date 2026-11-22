import type { Route } from 'next';
import Link from 'next/link';
import { Icono } from '@/components/ui/Icono';
import { PREGUNTAS_CHRONO } from '@/lib/reglas/inicio';

// Preguntas sugeridas: abren CHRONO con la pregunta ya escrita, sin enviarla.
export function AccesosChrono() {
  return (
    <section
      aria-labelledby="titulo-chrono"
      data-guia="accesos-chrono"
      className="rounded-tarjeta border border-borde bg-primario-suave p-4 shadow-suave"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primario text-sm font-bold text-white"
        >
          C
        </span>
        <h2 id="titulo-chrono" className="font-semibold text-texto">
          Pregúntale a CHRONO
        </h2>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {PREGUNTAS_CHRONO.map((pregunta) => (
          <li key={pregunta}>
            <Link
              href={`/gym/chat?pregunta=${encodeURIComponent(pregunta)}` as Route}
              className="flex min-h-11 items-center justify-between gap-2 rounded-boton border border-borde bg-superficie px-3 py-2 text-sm font-medium text-texto transition-[transform,border-color,color] duration-150 ease-out hover:-translate-y-px hover:border-primario hover:text-primario motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
            >
              {pregunta}
              <Icono nombre="flechaDerecha" className="h-4 w-4" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
