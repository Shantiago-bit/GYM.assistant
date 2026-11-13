'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { PanelGuia } from '@/components/guia/PanelGuia';
import { MenuPerfil } from '@/components/gym/MenuPerfil';

type Icono = 'ejercicios' | 'entrenar' | 'progreso' | 'asistente';

// Íconos simples en SVG en línea (sin dependencias). Son decorativos: el texto del enlace da el nombre.
const TRAZOS: Record<Icono, string> = {
  // Mancuerna.
  ejercicios: 'M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12',
  // Cronómetro.
  entrenar: 'M12 8v5l3 2M9 2h6M12 4a9 9 0 1 0 0 18a9 9 0 0 0 0-18',
  // Gráfico que sube.
  progreso: 'M3 20h18M5 16l5-5 4 3 6-7M15 7h5v5',
  // Globo de conversación.
  asistente: 'M4 5h16v11H9l-5 4z',
};

export function IconoMenu({ icono }: { icono: Icono }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0 md:hidden"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={TRAZOS[icono]} />
    </svg>
  );
}

// guia: valor de data-guia que usa el recorrido de inicio para resaltar cada enlace.
export const ENLACES_MENU: { href: Route; texto: string; guia: string; icono: Icono }[] = [
  { href: '/gym', texto: 'Mis ejercicios', guia: 'nav-ejercicios', icono: 'ejercicios' },
  { href: '/gym/entrenamiento', texto: 'Entrenar hoy', guia: 'nav-entrenamiento', icono: 'entrenar' },
  { href: '/gym/resumen', texto: 'Mi progreso', guia: 'nav-resumen', icono: 'progreso' },
  { href: '/gym/chat', texto: 'CHRONO (asistente)', guia: 'nav-chrono', icono: 'asistente' },
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
        <Link href="/gym" className={`inline-flex min-h-11 items-center whitespace-nowrap rounded text-lg font-bold ${CLASES_FOCO}`}>
          Gym Assistant
        </Link>

        <button
          type="button"
          className={`min-h-11 rounded border border-white/60 px-3 py-1.5 text-sm font-medium md:hidden ${CLASES_FOCO}`}
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
          {ENLACES_MENU.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              aria-current={estaActivo(enlace.href) ? 'page' : undefined}
              data-guia={enlace.guia}
              onClick={() => setMenuAbierto(false)}
              className={`flex min-h-11 items-center gap-3 whitespace-nowrap rounded px-1 text-base font-medium underline-offset-4 hover:underline aria-[current=page]:underline md:px-0 md:text-sm ${CLASES_FOCO}`}
            >
              <IconoMenu icono={enlace.icono} />
              {enlace.texto}
            </Link>
          ))}
          <MenuPerfil
            nombre={nombre}
            avatarUrl={avatarUrl}
            alElegir={() => setMenuAbierto(false)}
            claseBoton={`min-h-11 whitespace-nowrap rounded px-1 py-1 text-base font-medium md:px-0 md:text-sm ${CLASES_FOCO}`}
          />
        </nav>
        <PanelGuia />
      </div>
    </header>
  );
}
