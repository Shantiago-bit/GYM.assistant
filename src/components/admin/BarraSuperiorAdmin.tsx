import Link from 'next/link';
import { BuscadorPersonas } from '@/components/admin/BuscadorPersonas';
import type { RolAdmin } from '@/lib/datos/admin';

export const TEXTO_ROL: Record<RolAdmin, string> = { admin: 'Administrador', lectura: 'Solo lectura' };

// Barra superior: buscador de personas, acceso a la app y quién está administrando.
export function BarraSuperiorAdmin({ nombre, rol }: { nombre: string; rol: RolAdmin }) {
  return (
    <header className="vidrio flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <BuscadorPersonas />
      <div className="flex items-center gap-3">
        <Link href="/gym" className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-primario underline-offset-4 hover:underline">
          Ir a la app
        </Link>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-primario text-base font-bold text-white">
            {nombre.slice(0, 1).toUpperCase()}
          </span>
          <p className="text-sm leading-tight">
            <span className="block font-semibold text-texto">{nombre}</span>
            <span className="block text-texto-suave">{TEXTO_ROL[rol]}</span>
          </p>
        </div>
      </div>
    </header>
  );
}
