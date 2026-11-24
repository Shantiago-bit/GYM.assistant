'use client';

import { m } from 'framer-motion';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { PanelGuia } from '@/components/guia/PanelGuia';
import { Avatar } from '@/components/gym/Avatar';
import { MenuPerfil } from '@/components/gym/MenuPerfil';
import { BaldosaKairos } from '@/components/marca/BaldosaKairos';
import { LogotipoKairos } from '@/components/marca/LogotipoKairos';
import { SimboloChrono } from '@/components/marca/SimboloChrono';
import { clasesBoton } from '@/components/ui/Boton';
import { Icono, type NombreIcono } from '@/components/ui/Icono';
import { RESORTE_SUAVE } from '@/lib/movimiento';
import { CLAVE_MUSEO_VISTO } from '@/lib/reglas/museo';
import { leerLocal } from '@/lib/almacenamiento';

// El Pórtico: la navegación de /gym. Cada destino dice qué hay en él sin entrar (ícono, nombre y descripción).
// Escritorio (≥ 1024 px): barra superior fija con friso de greca, que se compacta al bajar. Móvil: encabezado
// mínimo arriba y una barra inferior con 5 destinos y "Entrenar" en el centro.
export interface Destino {
  id: 'inicio' | 'entrenar' | 'museo' | 'chrono';
  href: Route;
  nombre: string;
  descripcion: string;
  guia: string; // data-guia del recorrido de inicio
  icono: NombreIcono | 'chrono';
}

export const DESTINOS: Destino[] = [
  { id: 'inicio', href: '/gym', nombre: 'Inicio', descripcion: 'Tu día y tus ejercicios', guia: 'nav-inicio', icono: 'casa' },
  { id: 'entrenar', href: '/gym/entrenamiento', nombre: 'Entrenar hoy', descripcion: 'Registra tu sesión', guia: 'nav-entrenamiento', icono: 'cronometro' },
  { id: 'museo', href: '/gym/museo', nombre: 'Museo', descripcion: 'Tus récords y registros', guia: 'nav-museo', icono: 'templo' },
  { id: 'chrono', href: '/gym/chat', nombre: 'CHRONO', descripcion: 'Tu asistente', guia: 'nav-chrono', icono: 'chrono' },
];

const CLASES_FOCO =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario';

export const estaActivo = (ruta: string, href: string) => (href === '/gym' ? ruta === href : ruta.startsWith(href));

// Título de la página para el encabezado móvil.
export function tituloDeRuta(ruta: string): string {
  if (ruta === '/gym') return 'Inicio';
  if (ruta.startsWith('/gym/entrenamiento')) return 'Entrenar hoy';
  if (ruta.startsWith('/gym/museo')) return 'Museo';
  if (ruta.startsWith('/gym/mi-mes')) return 'Tu mes en el gym';
  if (ruta.startsWith('/gym/chat')) return 'CHRONO';
  if (ruta.startsWith('/gym/perfil')) return 'Perfil';
  if (ruta.startsWith('/gym/ejercicios')) return 'Ejercicios';
  return 'Kairós';
}

function IconoDestino({ destino, tamano }: { destino: Destino; tamano: number }) {
  if (destino.icono === 'chrono') return <SimboloChrono variante="mono" tamano={tamano} className="portico-chrono shrink-0" />;
  return <Icono nombre={destino.icono} className={tamano >= 24 ? 'h-6 w-6' : 'h-[22px] w-[22px]'} grosor={1.75} />;
}

// "Nuevo" en Museo hasta que la persona lo visite (localStorage; sin almacenamiento, la insignia no aparece).
function useMuseoNuevo(ruta: string): boolean {
  const [nuevo, setNuevo] = useState(false);
  useEffect(() => {
    const leer = () => {
      try {
        // Sin almacenamiento (el acceso lanza), la insignia no aparece.
        const almacen = window.localStorage;
        setNuevo(leerLocal(CLAVE_MUSEO_VISTO, almacen) !== '1');
      } catch {
        setNuevo(false);
      }
    };
    leer();
    window.addEventListener('kairos:museo-visto', leer);
    return () => window.removeEventListener('kairos:museo-visto', leer);
  }, [ruta]);
  return nuevo && !ruta.startsWith('/gym/museo');
}

function InsigniaNuevo() {
  return <span className="ml-1.5 rounded-full bg-acento px-1.5 text-sm font-bold leading-5 text-fondo">Nuevo</span>;
}

// nombre: el apodo o, si no hay, el primer nombre. avatarUrl: URL firmada de corta duración o null.
export function NavegacionGym({ nombre, avatarUrl, esAdmin = false }: { nombre: string; avatarUrl: string | null; esAdmin?: boolean }) {
  const ruta = usePathname();
  const [compacto, setCompacto] = useState(false);
  const museoNuevo = useMuseoNuevo(ruta);
  const idBase = useId();

  useEffect(() => {
    const alDesplazar = () => setCompacto(window.scrollY > 24);
    alDesplazar();
    window.addEventListener('scroll', alDesplazar, { passive: true });
    return () => window.removeEventListener('scroll', alDesplazar);
  }, []);

  const [inicio, entrenar, museo, chrono] = DESTINOS as [Destino, Destino, Destino, Destino];

  return (
    <header className="portico-cabecera sticky top-0 z-40 text-texto" data-compacto={compacto ? 'si' : undefined}>
      <div className="portico-barra relative mx-auto flex w-full max-w-screen-2xl items-center justify-between gap-3 px-4 lg:gap-4 lg:px-10">
        <Link href="/gym" className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded ${CLASES_FOCO}`}>
          <LogotipoKairos tamano="sm" />
        </Link>
        {/* Móvil: el título de la página. */}
        <p className="truncate font-titulos text-base font-semibold text-texto lg:hidden">{tituloDeRuta(ruta)}</p>

        {/* Una sola navegación con dos presentaciones: píldoras arriba (escritorio) y barra inferior (móvil). */}
        <nav aria-label="Secciones">
          <ul data-guia="portico" className="hidden items-center gap-1.5 lg:flex">
            {DESTINOS.map((destino) => {
              const activo = estaActivo(ruta, destino.href);
              const idTooltip = `${idBase}-${destino.id}`;
              return (
                <li key={destino.id} className="group relative">
                  <Link
                    href={destino.href}
                    aria-current={activo ? 'page' : undefined}
                    aria-describedby={idTooltip}
                    data-guia={destino.guia}
                    className={`relative flex min-h-11 items-center rounded-2xl px-3.5 py-1.5 text-texto ${CLASES_FOCO} ${destino.id === 'chrono' ? 'portico-destino-chrono' : ''}`}
                  >
                    {activo ? (
                      <m.span layoutId="portico-activo" aria-hidden="true" className="portico-activo absolute inset-0 rounded-2xl" transition={RESORTE_SUAVE} />
                    ) : (
                      <span aria-hidden="true" className="absolute inset-0 rounded-2xl transition-colors group-hover:bg-primario-suave" />
                    )}
                    <span className="relative flex items-center gap-2.5">
                      <IconoDestino destino={destino} tamano={22} />
                      <span className="flex flex-col text-left">
                        <span className="flex items-center text-sm font-semibold leading-5">
                          {destino.nombre}
                          {destino.id === 'museo' && museoNuevo ? <InsigniaNuevo /> : null}
                        </span>
                        <span aria-hidden="true" className="portico-desc text-sm leading-5 text-texto-suave">
                          {destino.descripcion}
                        </span>
                      </span>
                    </span>
                  </Link>
                  {/* Tooltip con la descripción: al pasar el cursor o al enfocar con el teclado. */}
                  <span
                    role="tooltip"
                    id={idTooltip}
                    className="pointer-events-none invisible absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-boton border border-borde-fuerte bg-elevada px-2.5 py-1.5 text-sm text-texto opacity-0 shadow-elevada transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                  >
                    {destino.descripcion}
                  </span>
                </li>
              );
            })}
          </ul>

          <ul data-guia="portico" className="portico-movil fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-end px-1 lg:hidden">
            {[inicio, museo].map((destino) => (
              <ItemMovil key={destino.id} destino={destino} activo={estaActivo(ruta, destino.href)} nuevo={destino.id === 'museo' && museoNuevo} />
            ))}
            <li className="flex justify-center">
              <Link
                href={entrenar.href}
                aria-current={estaActivo(ruta, entrenar.href) ? 'page' : undefined}
                data-guia={entrenar.guia}
                className={`group -mt-7 flex min-h-11 flex-col items-center gap-1 rounded-2xl px-1 pb-1.5 ${CLASES_FOCO}`}
              >
                <span className="portico-central flex h-16 w-16 items-center justify-center rounded-full">
                  <BaldosaKairos tamano="md" />
                </span>
                <span className="text-sm font-semibold leading-4 group-aria-[current=page]:text-primario">Entrenar</span>
              </Link>
            </li>
            <ItemMovil destino={chrono} activo={estaActivo(ruta, chrono.href)} />
            <li>
              <Link
                href="/gym/perfil"
                aria-current={ruta.startsWith('/gym/perfil') ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-texto-suave aria-[current=page]:text-primario ${CLASES_FOCO}`}
              >
                <Avatar url={avatarUrl} nombre={nombre} />
                <span className="text-sm font-semibold leading-4">Perfil</span>
              </Link>
            </li>
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          {estaActivo(ruta, entrenar.href) ? null : (
            <Link href={entrenar.href} className={`${clasesBoton()} hidden whitespace-nowrap lg:inline-flex`}>
              Entrenar hoy
            </Link>
          )}
          <MenuPerfil
            nombre={nombre}
            avatarUrl={avatarUrl}
            flotante
            ocultarNombre
            esAdmin={esAdmin}
            claseBoton={`min-h-11 min-w-11 whitespace-nowrap rounded px-1 py-1 text-sm font-medium ${CLASES_FOCO}`}
          />
        </div>
      </div>
      <PanelGuia />
    </header>
  );
}

function ItemMovil({ destino, activo, nuevo = false }: { destino: Destino; activo: boolean; nuevo?: boolean }) {
  return (
    <li>
      <Link
        href={destino.href}
        aria-current={activo ? 'page' : undefined}
        data-guia={destino.guia}
        className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-texto-suave aria-[current=page]:text-primario ${CLASES_FOCO}`}
      >
        <IconoDestino destino={destino} tamano={24} />
        <span className="text-sm font-semibold leading-4">{destino.nombre}</span>
        {nuevo ? (
          <>
            <span aria-hidden="true" data-insignia="nuevo" className="absolute right-[22%] top-1.5 h-2.5 w-2.5 rounded-full bg-acento ring-2 ring-fondo" />
            <span className="sr-only">, nuevo</span>
          </>
        ) : null}
      </Link>
    </li>
  );
}
