'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { useGuia } from '@/components/guia/ProveedorGuia';
import { Avatar } from '@/components/gym/Avatar';
import { supabase } from '@/lib/supabase';

const CLASE_OPCION =
  'block w-full rounded-gym px-3 py-2 text-left text-sm font-medium text-texto hover:bg-primario-suave focus:bg-primario-suave focus:outline-none';

// Botón con la foto y el apodo que abre el menú Perfil / Guía / Cerrar sesión. Se maneja con teclado:
// flechas para moverse, Inicio/Fin, Esc para cerrar (y volver al botón) y Tab para salir.
export function MenuPerfil({
  nombre,
  avatarUrl,
  alElegir,
  claseBoton,
}: {
  nombre: string;
  avatarUrl: string | null;
  alElegir?: () => void;
  claseBoton: string;
}) {
  const router = useRouter();
  const { abrirPanel } = useGuia();
  const [abierto, setAbierto] = useState(false);
  const idMenu = useId();
  const boton = useRef<HTMLButtonElement>(null);
  const contenedor = useRef<HTMLDivElement>(null);
  const opciones = useRef<(HTMLElement | null)[]>([]);

  const enfocar = (indice: number) => {
    const lista = opciones.current.filter((opcion): opcion is HTMLElement => opcion !== null);
    lista[(indice + lista.length) % lista.length]?.focus();
  };

  const abrir = (indice = 0) => {
    setAbierto(true);
    requestAnimationFrame(() => enfocar(indice));
  };

  const cerrar = (devolverFoco = true) => {
    setAbierto(false);
    if (devolverFoco) boton.current?.focus();
  };

  useEffect(() => {
    if (!abierto) return;
    const alPulsarFuera = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false);
    };
    window.addEventListener('mousedown', alPulsarFuera);
    return () => window.removeEventListener('mousedown', alPulsarFuera);
  }, [abierto]);

  const teclasBoton = (evento: React.KeyboardEvent) => {
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      abrir(evento.key === 'ArrowDown' ? 0 : -1);
    }
  };

  const teclasMenu = (evento: React.KeyboardEvent) => {
    const actual = opciones.current.indexOf(document.activeElement as HTMLElement);
    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault();
        enfocar(actual + 1);
        break;
      case 'ArrowUp':
        evento.preventDefault();
        enfocar(actual - 1);
        break;
      case 'Home':
        evento.preventDefault();
        enfocar(0);
        break;
      case 'End':
        evento.preventDefault();
        enfocar(-1);
        break;
      case 'Escape':
        evento.preventDefault();
        cerrar();
        break;
      case 'Tab':
        cerrar(false);
        break;
    }
  };

  const elegir = () => {
    cerrar(false);
    alElegir?.();
  };

  const cerrarSesion = async () => {
    elegir();
    await supabase?.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div ref={contenedor} className="relative">
      <button
        ref={boton}
        type="button"
        data-guia="menu-perfil"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={idMenu}
        onClick={() => (abierto ? cerrar(false) : abrir())}
        onKeyDown={teclasBoton}
        className={`flex items-center gap-2 ${claseBoton}`}
      >
        <Avatar url={avatarUrl} nombre={nombre} />
        <span className="max-w-40 truncate">{nombre}</span>
        <span aria-hidden="true" className="text-xs">
          ▾
        </span>
      </button>
      {abierto ? (
        <div
          id={idMenu}
          role="menu"
          aria-label="Tu cuenta"
          onKeyDown={teclasMenu}
          className="mt-1 w-full min-w-44 rounded-gym border border-borde bg-superficie p-1 shadow-soft md:absolute md:right-0 md:top-full md:z-50 md:mt-2 md:w-48"
        >
          <Link
            ref={(elemento) => {
              opciones.current[0] = elemento;
            }}
            href="/gym/perfil"
            role="menuitem"
            tabIndex={-1}
            onClick={elegir}
            className={CLASE_OPCION}
          >
            Perfil
          </Link>
          <button
            ref={(elemento) => {
              opciones.current[1] = elemento;
            }}
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              elegir();
              abrirPanel();
            }}
            className={CLASE_OPCION}
          >
            Guía
          </button>
          <button
            ref={(elemento) => {
              opciones.current[2] = elemento;
            }}
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => void cerrarSesion()}
            className={CLASE_OPCION}
          >
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}
