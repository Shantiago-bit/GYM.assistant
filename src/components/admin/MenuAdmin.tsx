'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import type { ContadoresMenu } from '@/lib/datos/admin';
import { SECCIONES_MENU } from './menu';
import { NOMBRE_APP } from '@/lib/config/marca';

function ListaMenu({ contadores, alElegir }: { contadores: ContadoresMenu; alElegir?: () => void }) {
  const ruta = usePathname();
  return (
    <div className="space-y-5">
      {SECCIONES_MENU.map((seccion) => (
        <div key={seccion.titulo}>
          <p className="px-3 text-sm font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-texto-claro-suave)]">
            {seccion.titulo}
          </p>
          <ul className="mt-2 space-y-1">
            {seccion.opciones.map((opcion) => {
              const contador = opcion.contador ? contadores[opcion.contador.clave] : 0;
              const insignia =
                opcion.contador && contador > 0 ? (
                  <span className="ml-auto rounded-full bg-[color:var(--admin-aviso-fondo)] px-2 py-0.5 text-sm font-bold tabular-nums text-[color:var(--admin-aviso-texto)]">
                    {contador.toLocaleString('es-CO')}
                    <span className="sr-only"> {opcion.contador.descripcion}</span>
                  </span>
                ) : null;
              const activa = ruta === opcion.href;
              if (!opcion.disponible) {
                return (
                  <li key={opcion.href}>
                    <span className="flex min-h-11 items-center gap-2 rounded-2xl px-3 text-sm text-[color:var(--admin-texto-claro-suave)]">
                      {opcion.texto}
                      <span className="text-sm italic">· Próximamente</span>
                      {insignia}
                    </span>
                  </li>
                );
              }
              return (
                <li key={opcion.href}>
                  <Link
                    href={opcion.href as Route}
                    aria-current={activa ? 'page' : undefined}
                    {...(alElegir ? { onClick: alElegir } : {})}
                    className={`flex min-h-11 items-center gap-2 rounded-2xl px-3 text-sm font-semibold transition ${
                      activa
                        ? 'bg-primario text-white'
                        : 'text-[color:var(--admin-texto-claro)] hover:bg-white/10'
                    }`}
                  >
                    {opcion.texto}
                    {insignia}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function BarraActivas({ contadores }: { contadores: ContadoresMenu }) {
  const { activasMes, totalCuentas } = contadores;
  const porcentaje = totalCuentas > 0 ? Math.round((activasMes / totalCuentas) * 100) : 0;
  return (
    <div className="rounded-2xl bg-white/10 p-3 text-sm">
      <p className="text-[color:var(--admin-texto-claro)]">
        Cuentas activas este mes: <strong>{activasMes.toLocaleString('es-CO')}</strong> de{' '}
        {totalCuentas.toLocaleString('es-CO')} registradas
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
        <div className="anim-llenar h-full rounded-full bg-[color:var(--admin-foco)]" style={{ width: `${porcentaje}%` }} />
      </div>
    </div>
  );
}

// Menú lateral fijo en pantallas anchas; en móvil, un botón abre el mismo menú como panel desplegable.
export function MenuAdmin({ contadores }: { contadores: ContadoresMenu }) {
  const [abierto, setAbierto] = useState(false);
  const idPanel = useId();
  const boton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    panel.current?.querySelector<HTMLElement>('a[href]')?.focus();
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        setAbierto(false);
        boton.current?.focus();
      }
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [abierto]);

  return (
    <>
      <aside className="vidrio-oscuro fixed inset-y-0 left-0 z-30 hidden w-72 flex-col justify-between overflow-y-auto p-5 lg:flex">
        <div>
          <p className="px-3 text-lg font-black tracking-tight">{NOMBRE_APP} · Admin</p>
          <nav aria-label="Panel de administración" className="mt-6">
            <ListaMenu contadores={contadores} />
          </nav>
        </div>
        <BarraActivas contadores={contadores} />
      </aside>

      <div className="lg:hidden">
        <button
          ref={boton}
          type="button"
          aria-expanded={abierto}
          aria-controls={idPanel}
          onClick={() => setAbierto((valor) => !valor)}
          className="vidrio-oscuro inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d={abierto ? 'M18 6L6 18M6 6l12 12' : 'M4 7h16M4 12h16M4 17h16'} />
          </svg>
          Menú del panel
        </button>
        <div ref={panel} id={idPanel} hidden={!abierto} className="vidrio-oscuro mt-2 space-y-5 rounded-3xl p-4">
          <nav aria-label="Panel de administración">
            <ListaMenu contadores={contadores} alElegir={() => setAbierto(false)} />
          </nav>
          <BarraActivas contadores={contadores} />
        </div>
      </div>
    </>
  );
}
