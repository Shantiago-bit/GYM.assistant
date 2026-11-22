'use client';

import type { AnchorHTMLAttributes, MouseEvent } from 'react';

// Cambia la consulta de la URL de la página actual sin pedirla otra vez al servidor. Next 15 sincroniza
// history.pushState con useSearchParams, así que los componentes que leen la consulta se actualizan solos.
//
// Por qué no <Link>: en producción, una navegación de Next a la MISMA página con otra consulta, bajo un
// loading.tsx (como /gym), reutiliza la precarga de la página sin consulta ("aliasing") y nunca termina; la URL
// no cambia. Ver Doc/ESTADO_EJECUCION.md (fix/filtros-inicio).
export function navegarLocal(href: string): void {
  const url = new URL(href, window.location.href);
  window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`);
  if (url.hash) document.getElementById(url.hash.slice(1))?.scrollIntoView({ block: 'start' });
}

// Enlace a otra consulta de la misma página. Con Ctrl, Cmd, Mayús o la rueda del ratón se comporta como un enlace
// normal (por ejemplo, para abrirlo en otra pestaña).
export function EnlaceLocal({ href, onClick, ...resto }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const alHacerClic = (evento: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(evento);
    if (evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) {
      return;
    }
    evento.preventDefault();
    navegarLocal(href);
  };
  return <a href={href} onClick={alHacerClic} {...resto} />;
}
