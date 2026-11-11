import type { Route } from 'next';
import Link from 'next/link';
import type { PrimerosPasos } from '@/lib/reglas/guia';

export function ListaPrimerosPasos({ primerosPasos }: { primerosPasos: PrimerosPasos }) {
  return (
    <ol className="space-y-2">
      {primerosPasos.pasos.map((paso, indice) => (
        <li key={paso.id} className="flex gap-3 rounded-gym border border-borde bg-superficie p-3">
          <span
            aria-hidden="true"
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              paso.hecho ? 'bg-primario text-white' : 'border-2 border-borde text-texto-suave'
            }`}
          >
            {paso.hecho ? '✓' : indice + 1}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-texto">
              {paso.hecho ? (
                <span>{paso.titulo}</span>
              ) : (
                <Link href={paso.href as Route} className="text-primario underline-offset-2 hover:underline">
                  {paso.titulo}
                </Link>
              )}
              <span className="sr-only">{paso.hecho ? ' (hecho)' : ' (pendiente)'}</span>
            </p>
            <p className="text-sm text-texto-suave">{paso.descripcion}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
