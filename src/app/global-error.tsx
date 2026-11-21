'use client';

// Último recurso cuando falla el layout raíz: reporta el error (si Sentry está activo) y ofrece reintentar.
// Reemplaza al layout, así que lleva su propio <html> y <body>.
import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { useEffect } from 'react';
import './globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="antialiased text-slate-900">
        <main id="contenido" className="flex min-h-screen items-center justify-center px-4 py-10">
          <div className="w-full max-w-md space-y-4 rounded-3xl border border-emerald-100 bg-white p-6 text-center shadow-lg">
            <title>Algo salió mal · Gym Assistant</title>
            <h1 className="text-2xl font-bold">Algo salió mal</h1>
            <p className="text-slate-700">
              Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={reset}
                className="min-h-11 rounded-full bg-emerald-700 px-5 py-2 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                Intentar de nuevo
              </button>
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-200 px-5 py-2 font-semibold text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                Ir al inicio
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
