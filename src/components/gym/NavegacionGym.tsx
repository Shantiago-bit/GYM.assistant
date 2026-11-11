'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { PanelGuia } from '@/components/guia/PanelGuia';
import { MenuPerfil } from '@/components/gym/MenuPerfil';

// guia: valor de data-guia que usa el recorrido de inicio para resaltar cada enlace.
const ENLACES: { href: Route; texto: string; guia: string }[] = [
  { href: '/gym', texto: 'Ejercicios', guia: 'nav-ejercicios' },
  { href: '/gym/entrenamiento', texto: 'Entrenamiento', guia: 'nav-entrenamiento' },
  { href: '/gym/resumen', texto: 'Resumen', guia: 'nav-resumen' },
  { href: '/gym/chat', texto: 'CHRONO', guia: 'nav-chrono' },
];

const CLASES_FOCO =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

// nombre: el apodo o, si no hay, el primer nombre. avatarUrl: URL firmada de corta duración o null.
export function NavegacionGym({ nombre, avatarUrl }: { nombre: string; avatarUrl: string | null }) {
  const ruta = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const estaActivo = (href: string) => (href === '/gym' ? ruta === href : ruta.startsWith(href));

  return (
    <header className="bg-primario text-white">
      <div className="relative mx-auto flex w-full max-w-screen-2xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
        <Link href="/gym" className={`whitespace-nowrap rounded text-lg font-bold ${CLASES_FOCO}`}>
          Gym Assistant
        </Link>

        <button
          type="button"
          className={`rounded border border-white/40 px-3 py-1.5 text-sm font-medium md:hidden ${CLASES_FOCO}`}
          aria-expanded={menuAbierto}
          aria-controls="menu-gym"
          data-guia="menu-movil"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
        >
          Menú
        </button>

        <nav
          id="menu-gym"
          aria-label="Principal"
          className={`${menuAbierto ? 'flex' : 'hidden'} absolute inset-x-0 top-14 z-40 flex-col gap-1 bg-primario px-4 pb-3 md:static md:flex md:flex-row md:items-center md:gap-4 md:p-0`}
        >
          {ENLACES.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              aria-current={estaActivo(enlace.href) ? 'page' : undefined}
              data-guia={enlace.guia}
              onClick={() => setMenuAbierto(false)}
              className={`whitespace-nowrap rounded py-1 text-sm font-medium underline-offset-4 hover:underline aria-[current=page]:underline ${CLASES_FOCO}`}
            >
              {enlace.texto}
            </Link>
          ))}
          <MenuPerfil
            nombre={nombre}
            avatarUrl={avatarUrl}
            alElegir={() => setMenuAbierto(false)}
            claseBoton={`whitespace-nowrap rounded py-1 text-sm font-medium ${CLASES_FOCO}`}
          />
        </nav>
        <PanelGuia />
      </div>
    </header>
  );
}
