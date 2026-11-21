import Link from 'next/link';
import { Icono } from '@/components/ui/Icono';

export function VolverAlInicio() {
  return (
    <Link
      href="/"
      className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
    >
      <Icono nombre="flechaIzquierda" className="h-4 w-4" />
      Volver al inicio
    </Link>
  );
}
