import Link from 'next/link';

export function VolverAlInicio() {
  return (
    <Link
      href="/"
      className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
    >
      <span aria-hidden="true">←</span>
      Volver al inicio
    </Link>
  );
}
