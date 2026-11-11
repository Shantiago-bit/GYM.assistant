'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const ENLACES: { href: Route; texto: string }[] = [
  { href: '/gym', texto: 'Ejercicios' },
  { href: '/gym/entrenamiento', texto: 'Entrenamiento' },
  { href: '/gym/resumen', texto: 'Resumen' },
  { href: '/gym/chat', texto: 'CHRONO' },
];

const CLASES_FOCO =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

export function NavegacionGym({ email }: { email: string }) {
  const router = useRouter();
  const ruta = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const cerrarSesion = async () => {
    await supabase?.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const estaActivo = (href: string) => (href === '/gym' ? ruta === href : ruta.startsWith(href));

  return (
    <header className="bg-primario text-white">
      <div className="relative mx-auto flex w-full max-w-screen-2xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
        <Link href="/gym" className={`rounded text-lg font-bold ${CLASES_FOCO}`}>
          Gym Assistant
        </Link>

        <button
          type="button"
          className={`rounded border border-white/40 px-3 py-1.5 text-sm font-medium md:hidden ${CLASES_FOCO}`}
          aria-expanded={menuAbierto}
          aria-controls="menu-gym"
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
              onClick={() => setMenuAbierto(false)}
              className={`rounded py-1 text-sm font-medium underline-offset-4 hover:underline aria-[current=page]:underline ${CLASES_FOCO}`}
            >
              {enlace.texto}
            </Link>
          ))}
          <span className="max-w-48 truncate text-sm text-white/85" title={email}>
            {email}
          </span>
          <button
            type="button"
            onClick={cerrarSesion}
            className={`rounded py-1 text-left text-sm font-medium underline-offset-4 hover:underline ${CLASES_FOCO}`}
          >
            Cerrar sesión
          </button>
        </nav>
      </div>
    </header>
  );
}
