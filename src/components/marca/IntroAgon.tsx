'use client';

import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { LEMA, NOMBRE_APP } from '@/lib/config/marca';
import { hoyBogota } from '@/lib/reglas/fechas';

// Intro animada del home (Doc/marca/agon/agon-intro-referencia.html, --v: 0.55, unos 2 s). Solo en / y /gym, solo
// la primera vez del día (hora de Colombia) y nunca con movimiento reducido ni si se llegó con un ancla o parámetros.
// Es una capa sobre la página ya renderizada: no la reemplaza, no atrapa el foco y se desmonta al terminar.
export const CLAVE_INTRO = 'agon_intro_dia';
export const RUTAS_INTRO = ['/', '/gym'];
const V = 0.55;
// Lo último que se mueve es el lema: empieza en v × 3,2 s y dura v × 0,6 s.
export const DURACION_INTRO_MS = Math.round(V * 3.8 * 1000);
export const SALIDA_FIN_MS = 300;
export const SALIDA_SALTAR_MS = 200;

type Estado = 'oculta' | 'visible' | 'fin' | 'saltar';

function leerUltimoDia(): string | null {
  try {
    return window.localStorage.getItem(CLAVE_INTRO);
  } catch {
    return null;
  }
}

function guardarDia(dia: string) {
  try {
    window.localStorage.setItem(CLAVE_INTRO, dia);
  } catch {
    // Sin almacenamiento (modo privado, sitio bloqueado): la intro puede repetirse, no pasa nada.
  }
}

function debeMostrarse(ruta: string): boolean {
  if (!RUTAS_INTRO.includes(ruta)) return false;
  if (window.location.hash || window.location.search) return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  return leerUltimoDia() !== hoyBogota();
}

const retardo = (s: number): CSSProperties => ({ animationDelay: `calc(var(--v) * ${s}s)` });
const desvio = (dx: number, dy: number, s: number) => ({ ...retardo(s), '--dx': `${dx}px`, '--dy': `${dy}px` }) as CSSProperties;

const CHISPAS: [number, number, number, number, number][] = [
  [16, 26, -3, -4, 0.6],
  [16, 38, -3, 4, 0.6],
  [48, 26, 3, -4, 0.6],
  [48, 38, 3, 4, 0.6],
  [10, 28, -4, -3, 0.85],
  [54, 36, 4, 3, 0.85],
];
const POLVO: [number, number, number, number][] = [
  [26, -9, -3, 2.12],
  [29, -5, -5, 2.15],
  [31, -2, -6, 2.1],
  [33, 3, -6, 2.13],
  [35, 6, -4, 2.16],
  [38, 9, -2, 2.11],
];

export function IntroAgon() {
  const ruta = usePathname();
  const [estado, setEstado] = useState<Estado>('oculta');
  const id = `ia-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  const salir = useCallback((modo: 'fin' | 'saltar') => {
    setEstado((actual) => (actual === 'visible' ? modo : actual));
  }, []);

  useEffect(() => {
    if (!debeMostrarse(ruta)) return;
    guardarDia(hoyBogota());
    setEstado('visible');
  }, [ruta]);

  // Al terminar la animación se desvanece; al terminar de desvanecerse se desmonta.
  useEffect(() => {
    clearTimeout(temporizador.current);
    if (estado === 'visible') temporizador.current = setTimeout(() => salir('fin'), DURACION_INTRO_MS);
    if (estado === 'fin' || estado === 'saltar') {
      temporizador.current = setTimeout(() => setEstado('oculta'), estado === 'fin' ? SALIDA_FIN_MS : SALIDA_SALTAR_MS);
    }
    return () => clearTimeout(temporizador.current);
  }, [estado, salir]);

  useEffect(() => {
    if (estado !== 'visible') return;
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') salir('saltar');
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [estado, salir]);

  if (estado === 'oculta') return null;

  const degradado = `url(#${id})`;
  // En <body>: así ningún contenedor animado de la página (transform) cambia su posición fija.
  return createPortal(
    // Una región con nombre: lo único que se anuncia es «Agón» (la animación está oculta) y el botón Saltar.
    <section
      aria-label="Presentación"
      className="intro-agon"
      data-testid="intro-agon"
      data-saliendo={estado === 'visible' ? undefined : estado}
      onClick={() => salir('saltar')}
    >
      <p className="sr-only">{NOMBRE_APP}</p>
      <div aria-hidden="true" className="ia-anim">
        <div className="escena">
          <div className="halo" />
          <div className="marco">
            <div className="metal" />
            <div className="filo" />
          </div>
          <svg aria-hidden="true" className="ia-svg" width="320" height="320" viewBox="0 0 64 64" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id={id} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
                <stop offset="0" style={{ stopColor: 'var(--marca-degradado-1)' }} />
                <stop offset="0.55" style={{ stopColor: 'var(--marca-degradado-2)' }} />
                <stop offset="1" style={{ stopColor: 'var(--marca-degradado-3)' }} />
              </linearGradient>
            </defs>
            <circle className="onda" cx="32" cy="32" r="21" strokeWidth="1" />
            <g className="escudo">
              <circle className="aro-ext" cx="32" cy="32" r="21" stroke={degradado} strokeWidth="3.2" transform="rotate(-90 32 32)" />
              <circle className="aro-int" cx="32" cy="32" r="15" stroke={degradado} strokeWidth="1.4" transform="rotate(-90 32 32)" />
            </g>
            <g className="orbita">
              <circle className="orbita-punto" cx="32" cy="11" r="1.5" />
              <circle className="orbita-halo" cx="32" cy="11" r="3.2" />
            </g>
            <g className="elevar">
              <g className="sacudir">
                <path className="barra" d="M32 32H5" stroke={degradado} strokeWidth="2.8" />
                <path className="barra" d="M32 32H59" stroke={degradado} strokeWidth="2.8" />
                <rect className="disco disco-i1" x="11" y="23" width="5" height="18" rx="1.2" fill={degradado} />
                <rect className="disco disco-d1" x="48" y="23" width="5" height="18" rx="1.2" fill={degradado} />
                <rect className="disco disco-i2" x="6.5" y="26.5" width="3.5" height="11" rx="1" fill={degradado} />
                <rect className="disco disco-d2" x="54" y="26.5" width="3.5" height="11" rx="1" fill={degradado} />
                {CHISPAS.map(([cx, cy, dx, dy, s]) => (
                  <circle key={`${cx}-${cy}`} className="chispa" cx={cx} cy={cy} r="0.7" style={desvio(dx, dy, s)} />
                ))}
              </g>
            </g>
            {POLVO.map(([cx, dx, dy, s]) => (
              <circle key={cx} className="polvo" cx={cx} cy="55" r="0.9" style={desvio(dx, dy, s)} />
            ))}
          </svg>
        </div>
        <p className="palabra">
          <span className="letra" style={retardo(2.45)}>A</span>
          <span className="letra" style={retardo(2.54)}>G</span>
          <span className="con-tilde">
            <span className="letra" style={retardo(2.63)}>O</span>
            <span className="tilde" />
          </span>
          <span className="letra" style={retardo(2.72)}>N</span>
        </p>
        <p className="lema">{LEMA}</p>
      </div>
      <button
        type="button"
        className="ia-saltar"
        onClick={(evento) => {
          evento.stopPropagation();
          salir('saltar');
        }}
      >
        Saltar
      </button>
    </section>,
    document.body,
  );
}
