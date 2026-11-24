'use client';

import { useEffect, useRef } from 'react';

// Barra fina arriba que se llena al bajar por una página larga (privacidad, detalle de un ejercicio, Museo).
// Decorativa (aria-hidden): escala en X con requestAnimationFrame, sin volver a pintar React en cada scroll.
export function BarraLectura() {
  const barra = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cuadro = 0;
    const pintar = () => {
      cuadro = 0;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const avance = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
      if (barra.current) barra.current.style.transform = `scaleX(${avance})`;
    };
    const alDesplazar = () => {
      if (!cuadro) cuadro = requestAnimationFrame(pintar);
    };
    pintar();
    window.addEventListener('scroll', alDesplazar, { passive: true });
    window.addEventListener('resize', alDesplazar);
    return () => {
      cancelAnimationFrame(cuadro);
      window.removeEventListener('scroll', alDesplazar);
      window.removeEventListener('resize', alDesplazar);
    };
  }, []);

  return <div ref={barra} aria-hidden="true" className="barra-lectura" data-testid="barra-lectura" style={{ transform: 'scaleX(0)' }} />;
}
