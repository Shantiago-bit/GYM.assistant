'use client';

import { useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNivelMovimiento } from '@/components/ui/ProveedorMovimiento';
import { DURACION_CONFETI_MS, DURACION_CONTADOR_MS, valorDelContador } from '@/lib/movimiento';

// true si la persona pidió menos movimiento en su sistema o eligió el nivel "Mínimas" en su perfil.
export function usePrefiereMenosMovimiento(): boolean {
  const sistema = useReducedMotion() ?? false;
  const { nivel } = useNivelMovimiento();
  return sistema || nivel === 'minimas';
}

const FORMATO = new Intl.NumberFormat('es-CO');

// true la primera vez que el elemento se ve en pantalla (60 %). Sin IntersectionObserver, nunca se anima.
function useVistoUnaVez(ref: React.RefObject<Element | null>): boolean {
  const [visto, setVisto] = useState(false);
  useEffect(() => {
    const elemento = ref.current;
    if (!elemento || visto || typeof IntersectionObserver === 'undefined') return;
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          setVisto(true);
          observador.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [ref, visto]);
  return visto;
}

// Número que cuenta desde 0 hasta su valor en 600 ms la primera vez que entra en pantalla. El valor real está
// siempre en el texto para lectores de pantalla; el que cuenta es decorativo. Con movimiento reducido (o sin
// IntersectionObserver), muestra el valor directamente.
export function NumeroAnimado({ valor, sufijo = '', className = '' }: { valor: number; sufijo?: string | undefined; className?: string }) {
  const reducir = usePrefiereMenosMovimiento();
  const ref = useRef<HTMLSpanElement>(null);
  const enPantalla = useVistoUnaVez(ref);
  const [mostrado, setMostrado] = useState(valor);
  const animado = useRef(false);

  useEffect(() => {
    if (reducir || typeof IntersectionObserver === 'undefined' || animado.current) {
      setMostrado(valor);
      return;
    }
    if (!enPantalla) {
      setMostrado(0);
      return;
    }
    animado.current = true;
    const inicio = performance.now();
    let cuadro = 0;
    const paso = (ahora: number) => {
      const actual = valorDelContador(valor, ahora - inicio);
      setMostrado(actual);
      if (ahora - inicio < DURACION_CONTADOR_MS) cuadro = requestAnimationFrame(paso);
      else setMostrado(valor);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [enPantalla, reducir, valor]);

  // Mientras cuenta, el número que cambia es decorativo y el lector de pantalla lee el valor final; al terminar
  // queda un solo texto.
  if (mostrado === valor) {
    return (
      <span ref={ref} className={`tabular-nums ${className}`}>
        {FORMATO.format(valor)}
        {sufijo}
      </span>
    );
  }
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      <span aria-hidden="true">
        {FORMATO.format(mostrado)}
        {sufijo}
      </span>
      <span className="sr-only">
        {FORMATO.format(valor)}
        {sufijo}
      </span>
    </span>
  );
}

// Check que se dibuja con un trazo SVG (350 ms). Con movimiento reducido, la regla global lo deja dibujado.
export function CheckDibujado({ texto }: { texto: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" className="trazo-dibujado" style={{ ['--largo-trazo' as string]: '24' }} />
      </svg>
      {texto}
    </span>
  );
}

// Ráfaga breve de confeti (16 partículas lavanda y ciruela, 1,1 s), solo para momentos importantes. Nunca se
// monta con movimiento reducido y se desmonta sola al terminar.
const COLORES_CONFETI = ['var(--color-lavanda)', 'var(--color-primario)', 'var(--color-acento)', 'var(--color-primario-suave)'];

export function Confeti({ particulas = 16, conMancuernas = false }: { particulas?: number; conMancuernas?: boolean }) {
  const reducir = usePrefiereMenosMovimiento();
  const [activo, setActivo] = useState(true);
  const piezas = useMemo(
    () =>
      Array.from({ length: Math.min(30, Math.max(12, particulas)) }, (_, i) => {
        const angulo = (i / particulas) * Math.PI * 2;
        const distancia = 70 + ((i * 37) % 60);
        return {
          x: `${Math.round(Math.cos(angulo) * distancia)}px`,
          y: `${Math.round(Math.sin(angulo) * distancia - 40)}px`,
          giro: `${(i % 2 ? 1 : -1) * (120 + i * 20)}deg`,
          color: COLORES_CONFETI[i % COLORES_CONFETI.length],
          forma: i % 3 === 0 ? '9999px' : '2px',
          // En las metas logradas, una de cada cuatro partículas es una mancuerna pequeña.
          mancuerna: conMancuernas && i % 4 === 0,
        };
      }),
    [particulas, conMancuernas],
  );

  useEffect(() => {
    const temporizador = setTimeout(() => setActivo(false), DURACION_CONFETI_MS + 100);
    return () => clearTimeout(temporizador);
  }, []);

  if (reducir || !activo) return null;
  return (
    <span aria-hidden="true" data-confeti="" className="pointer-events-none absolute left-1/2 top-1/3 z-10 h-0 w-0">
      {piezas.map((pieza, i) => (
        <span
          key={i}
          className={`particula-confeti absolute block ${pieza.mancuerna ? 'h-2.5 w-5' : 'h-2 w-2'}`}
          style={
            {
              '--x': pieza.x,
              '--y': pieza.y,
              '--giro': pieza.giro,
              '--duracion': `${DURACION_CONFETI_MS}ms`,
              background: pieza.mancuerna ? undefined : pieza.color,
              borderRadius: pieza.mancuerna ? undefined : pieza.forma,
            } as React.CSSProperties
          }
        >
          {pieza.mancuerna ? (
            <svg aria-hidden="true" viewBox="0 0 20 10" className="h-full w-full" fill="var(--color-lavanda)">
              <rect x="3" y="4" width="14" height="2" rx="1" />
              <rect x="2" y="1" width="3" height="8" rx="1" />
              <rect x="15" y="1" width="3" height="8" rx="1" />
            </svg>
          ) : null}
        </span>
      ))}
    </span>
  );
}
