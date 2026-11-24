'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Estado = 'quieta' | 'cargando' | 'terminando';

// Barra fina con el degradado morado arriba mientras se navega entre páginas de /gym. Empieza al tocar un enlace
// interno a otra página y termina cuando cambia la ruta (o a los 10 s, por si la navegación se cancela).
// Decorativa: el cambio de página ya lo anuncia el título.
export function BarraNavegacion() {
  const ruta = usePathname();
  const [estado, setEstado] = useState<Estado>('quieta');
  const seguridad = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const alTocar = (evento: MouseEvent) => {
      if (evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
      const enlace = (evento.target as Element | null)?.closest?.('a[href]');
      if (!(enlace instanceof HTMLAnchorElement) || enlace.target === '_blank' || enlace.hasAttribute('download')) return;
      const destino = new URL(enlace.href, window.location.href);
      if (destino.origin !== window.location.origin) return;
      if (destino.pathname === window.location.pathname && destino.search === window.location.search) return;
      setEstado('cargando');
      clearTimeout(seguridad.current);
      seguridad.current = setTimeout(() => setEstado('quieta'), 10_000);
    };
    document.addEventListener('click', alTocar, true);
    return () => {
      document.removeEventListener('click', alTocar, true);
      clearTimeout(seguridad.current);
    };
  }, []);

  useEffect(() => {
    setEstado((actual) => (actual === 'cargando' ? 'terminando' : actual));
    const t = setTimeout(() => setEstado((actual) => (actual === 'terminando' ? 'quieta' : actual)), 400);
    return () => clearTimeout(t);
  }, [ruta]);

  return <div aria-hidden="true" className="barra-navegacion" data-estado={estado} data-testid="barra-navegacion" />;
}
