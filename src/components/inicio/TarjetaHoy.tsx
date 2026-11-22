'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Confeti, NumeroAnimado } from '@/components/ui/Movimiento';
import type { SiguientePaso } from '@/lib/reglas/siguientePaso';

const CLAVE_CELEBRADO = 'gym-inicio-celebrado';

// La microcelebración sale una vez por día: se recuerda en este navegador (si no se puede guardar, no sale, para
// no repetirla en cada visita).
function usePrimeraVezHoy(hoy: string, activo: boolean): boolean {
  const [celebrar, setCelebrar] = useState(false);
  useEffect(() => {
    if (!activo) return;
    try {
      if (window.localStorage.getItem(CLAVE_CELEBRADO) === hoy) return;
      window.localStorage.setItem(CLAVE_CELEBRADO, hoy);
      setCelebrar(true);
    } catch {
      // Sin almacenamiento: sin celebración.
    }
  }, [hoy, activo]);
  return celebrar;
}

// La tarjeta principal del inicio: la única con fondo de color. Usa el siguiente paso de hoy (pasoDeHoy); si hoy
// ya se entrenó, muestra el resumen del día.
export function TarjetaHoy({
  paso,
  hoy,
  resumen,
}: {
  paso: SiguientePaso;
  hoy: string;
  // Solo cuando hoy ya se entrenó.
  resumen: { ejercicios: number; series: number; volumenKg: number } | null;
}) {
  const celebrar = usePrimeraVezHoy(hoy, resumen !== null);
  return (
    <section
      aria-labelledby="titulo-hoy"
      data-guia="hoy"
      className="relative flex h-full flex-col overflow-hidden rounded-tarjeta bg-gradient-to-br from-primario to-primario-fuerte p-5 text-white shadow-elevada sm:p-6"
    >
      {celebrar ? <Confeti /> : null}
      {/* Círculos decorativos. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-white/5"
      />

      <h2 id="titulo-hoy" className="text-sm font-semibold uppercase tracking-wide text-white/90">
        Hoy
      </h2>
      {resumen ? (
        <>
          <p className="mt-1 font-titulos text-2xl font-bold sm:text-3xl">¡Bien hecho!</p>
          <dl className="mt-3 grid max-w-md grid-cols-3 gap-3">
            {[
              {
                valor: resumen.ejercicios,
                etiqueta: resumen.ejercicios === 1 ? 'ejercicio' : 'ejercicios',
              },
              { valor: resumen.series, etiqueta: 'series' },
              { valor: resumen.volumenKg, etiqueta: 'kg de volumen' },
            ].map((dato) => (
              // La cifra se ve arriba, pero en el código la etiqueta va primero (dt antes de dd).
              <div
                key={dato.etiqueta}
                className="flex flex-col-reverse rounded-boton bg-white/10 px-3 py-2"
              >
                <dt className="text-xs text-white/90">{dato.etiqueta}</dt>
                <dd className="text-xl font-bold tabular-nums">
                  <NumeroAnimado valor={dato.valor} />
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 max-w-prose text-base text-white/95">{paso.explicacion}</p>
        </>
      ) : (
        <>
          <p className="mt-1 font-titulos text-2xl font-bold sm:text-3xl">{paso.titulo}</p>
          <p className="mt-2 max-w-prose text-base text-white/95">{paso.explicacion}</p>
        </>
      )}
      <div className="mt-auto pt-5">
        <Link
          href={paso.accion.href as Route}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-boton bg-superficie px-5 py-3 text-base font-bold text-primario-fuerte shadow-suave transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-px hover:shadow-elevada active:scale-[0.97] motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
        >
          {paso.accion.texto}
        </Link>
      </div>
    </section>
  );
}
