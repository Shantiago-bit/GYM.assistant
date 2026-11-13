import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { clasesBoton } from '@/components/ui/Boton';
import type { SiguientePaso } from '@/lib/reglas/siguientePaso';

// "Tu siguiente paso" (detalle del ejercicio) o "Hoy" (/gym): un título, una explicación y un solo botón.
export function TarjetaSiguientePaso({
  paso,
  encabezado = 'Tu siguiente paso',
  guia,
  guiaBoton,
  children,
}: {
  paso: SiguientePaso;
  encabezado?: string;
  guia?: string | undefined;
  guiaBoton?: string | undefined;
  children?: ReactNode;
}) {
  return (
    <section
      aria-labelledby="titulo-siguiente-paso"
      className="mb-6 rounded-gym border border-primario bg-primario-suave p-4 sm:p-5"
      data-guia={guia}
    >
      <h2 id="titulo-siguiente-paso" className="text-sm font-semibold uppercase tracking-wide text-texto">
        {encabezado}
      </h2>
      <p className="mt-1 text-xl font-bold text-texto">{paso.titulo}</p>
      <p className="mt-1 text-base text-texto">{paso.explicacion}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href={paso.accion.href as Route} className={clasesBoton()} data-guia={guiaBoton}>
          {paso.accion.texto}
        </Link>
        {children}
      </div>
    </section>
  );
}
