'use client';

import { m, type Transition } from 'framer-motion';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { CURVA_SALIDA, RESORTE_SUAVE } from '@/lib/movimiento';
import { BaldosaChrono } from './BaldosaChrono';
import {
  CHI_FINO,
  CHI_GRUESO,
  HOJA,
  HOJAS_DERECHA,
  HOJAS_IZQUIERDA,
  RAMA_DERECHA,
  RAMA_IZQUIERDA,
  transformarHoja,
} from './geometriaChrono';

// Intro de CHRONO (Doc/marca/chrono/chrono-intro-referencia.html, «corte, sello y laurel», unos 3,1 s). El logo se
// forma en grande en el centro del chat y, al terminar, se encoge y se desplaza hasta la baldosa del encabezado
// (layoutId compartido "chrono-logo"), mientras el chat entra desde el costado contrario. El chat está debajo desde
// el primer instante: la intro es una capa encima y nunca retrasa la carga.
export const CLAVE_INTRO_CHRONO = 'chrono_intro_vista';
export const LAYOUT_ID_LOGO = 'chrono-logo';
export const DURACION_COMPLETA_MS = 3100; // la palabra CHRONO termina a los 3,1 s
export const ESPERA_CORTA_MS = 300; // la corta: el logo ya formado, quieto
export const SALIDA_MS = 700;
export const SALIDA_SALTAR_MS = 300;

export type ModoIntro = 'completa' | 'corta' | 'ninguna';
export type FaseIntro = 'inicio' | 'animando' | 'salida' | 'fin';

// Completa la primera vez de la sesión del navegador; corta en las siguientes y si llega una pregunta ya escrita;
// ninguna con movimiento reducido.
export function decidirModo({ reducido, yaVista, conPregunta }: { reducido: boolean; yaVista: boolean; conPregunta: boolean }): ModoIntro {
  if (reducido) return 'ninguna';
  return yaVista || conPregunta ? 'corta' : 'completa';
}

function leerVista(): boolean {
  try {
    return window.sessionStorage.getItem(CLAVE_INTRO_CHRONO) === '1';
  } catch {
    return false;
  }
}

function marcarVista() {
  try {
    window.sessionStorage.setItem(CLAVE_INTRO_CHRONO, '1');
  } catch {
    // Sin almacenamiento la próxima apertura vuelve a ser completa: no pasa nada.
  }
}

// En el servidor no hay layout: useLayoutEffect solo en el navegador (decide antes de pintar al navegar).
const useEfectoDeDiseno = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export interface EstadoIntroChrono {
  modo: ModoIntro;
  fase: FaseIntro;
  saltada: boolean;
  saltar: () => void;
}

export function useIntroChrono(conPregunta: boolean, campo: RefObject<HTMLTextAreaElement | null>): EstadoIntroChrono {
  const [modo, setModo] = useState<ModoIntro>('ninguna');
  const [fase, setFase] = useState<FaseIntro>('inicio');
  const [saltada, setSaltada] = useState(false);
  const decidido = useRef(false);

  useEfectoDeDiseno(() => {
    // Una sola decisión por montaje (en desarrollo, React ejecuta los efectos dos veces).
    if (decidido.current) return;
    decidido.current = true;
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const elegido = decidirModo({ reducido, yaVista: leerVista(), conPregunta });
    setModo(elegido);
    if (elegido === 'ninguna') {
      setFase('fin');
      return;
    }
    marcarVista();
    setFase('animando');
  }, [conPregunta]);

  useEffect(() => {
    if (fase === 'animando') {
      const t = setTimeout(() => setFase('salida'), modo === 'completa' ? DURACION_COMPLETA_MS : ESPERA_CORTA_MS);
      return () => clearTimeout(t);
    }
    if (fase === 'salida') {
      const t = setTimeout(() => setFase('fin'), saltada ? SALIDA_SALTAR_MS : SALIDA_MS);
      return () => clearTimeout(t);
    }
    if (fase === 'fin' && modo !== 'ninguna') campo.current?.focus();
    return undefined;
  }, [fase, modo, saltada, campo]);

  // Saltar (botón, Esc, clic o toque): directo a la salida, en 300 ms.
  const saltar = useCallback(() => {
    if (fase !== 'animando') return;
    setSaltada(true);
    setFase('salida');
  }, [fase]);

  useEffect(() => {
    if (fase !== 'animando') return undefined;
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') saltar();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [fase, saltar]);

  return { modo, fase, saltada, saltar };
}

const transicionLogo = (saltada: boolean): Transition =>
  saltada ? { duration: SALIDA_SALTAR_MS / 1000, ease: CURVA_SALIDA } : RESORTE_SUAVE;

// La baldosa del encabezado del chat. Mientras la intro anima, un hueco del mismo tamaño; en la salida, la baldosa
// con el layoutId compartido, que framer-motion lleva desde el centro hasta aquí. Sin intro, la baldosa quieta.
export function RanuraLogoChrono({ fase, modo, saltada }: Pick<EstadoIntroChrono, 'fase' | 'modo' | 'saltada'>) {
  if (fase === 'animando') return <span aria-hidden="true" data-testid="ranura-chrono" className="block h-11 w-11 shrink-0" />;
  if (modo === 'ninguna' || fase === 'inicio') return <BaldosaChrono tamano="md" />;
  return (
    <m.span layoutId={LAYOUT_ID_LOGO} transition={transicionLogo(saltada)} className="relative z-30 block shrink-0">
      <BaldosaChrono tamano="md" />
    </m.span>
  );
}

const retardo = (s: number): CSSProperties => ({ animationDelay: `calc(var(--v) * ${s}s)` });
const desvio = (dx: number, dy: number, s: number) => ({ ...retardo(s), '--dx': `${dx}px`, '--dy': `${dy}px` }) as CSSProperties;

const RETARDOS_HOJAS_IZQUIERDA = [1.3, 1.35, 1.41, 1.47, 1.52, 1.58, 1.63, 1.69, 1.74];
const RETARDOS_HOJAS_DERECHA = [1.38, 1.44, 1.49, 1.55, 1.6, 1.66, 1.71, 1.77, 1.82];
const CHISPAS: [number, number, number, number, number][] = [
  [24.5, 21.5, -7, -7, 0.42],
  [39.5, 42.5, 7, 7, 0.47],
  [32, 32, -2, 8, 0.45],
  [39.5, 21.5, 7, -7, 0.77],
  [24.5, 42.5, -7, 7, 0.82],
  [32, 32, 8, -1, 0.8],
];

// La capa de la intro, sobre el chat. La animación es decorativa (aria-hidden); los lectores oyen una vez
// «CHRONO, tu asistente». No atrapa el foco: el botón Saltar es un botón más.
export function IntroChrono({ fase, modo, saltada, saltar }: EstadoIntroChrono) {
  const base = `ic-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  if (fase !== 'animando' && fase !== 'salida') return null;
  const degradado = `url(#${base}-g)`;

  return (
    <div
      className="intro-chrono"
      data-testid="intro-chrono"
      data-fase={fase}
      data-modo={modo}
      data-saltada={saltada ? 'si' : undefined}
      onClick={saltar}
    >
      <p role="status" className="sr-only">
        CHRONO, tu asistente
      </p>
      <div aria-hidden="true" className="ic-anim">
        <div className="ic-escena">
          <div className="ic-halo" />
          {fase === 'animando' ? (
            <m.div layoutId={LAYOUT_ID_LOGO} className="ic-logo">
              <div className="ic-baldosa">
                <div className="ic-brillo" />
              </div>
              <svg aria-hidden="true" className="ic-svg" viewBox="0 0 64 64" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id={`${base}-g`} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
                    <stop offset="0" style={{ stopColor: 'var(--marca-degradado-1)' }} />
                    <stop offset="0.55" style={{ stopColor: 'var(--marca-degradado-2)' }} />
                    <stop offset="1" style={{ stopColor: 'var(--marca-degradado-3)' }} />
                  </linearGradient>
                  <mask id={`${base}-a`} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
                    <line className="ic-revela ic-revela-1" x1="23.36" y1="21.2" x2="40.64" y2="42.8" strokeWidth="11" />
                  </mask>
                  <mask id={`${base}-b`} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
                    <line className="ic-revela ic-revela-2" x1="40.64" y1="21.2" x2="23.36" y2="42.8" strokeWidth="11" />
                  </mask>
                </defs>
                <circle className="ic-onda" cx="32" cy="32" r="9" strokeWidth="1.2" />
                {(
                  [
                    ['i', RAMA_IZQUIERDA, HOJAS_IZQUIERDA, RETARDOS_HOJAS_IZQUIERDA, 1.05],
                    ['d', RAMA_DERECHA, HOJAS_DERECHA, RETARDOS_HOJAS_DERECHA, 1.13],
                  ] as const
                ).map(([lado, rama, hojas, retardos, retardoRama]) => (
                  <g key={lado} className={`ic-vuelo-${lado} ${lado === 'i' ? 'laurel-izquierdo' : 'laurel-derecho'}`}>
                    <g className={`ic-union-${lado}`}>
                      <path className="ic-rama" style={retardo(retardoRama)} d={rama} stroke={degradado} strokeWidth="2.2" />
                      {hojas.map((hoja, indice) => (
                        <g key={hoja.join()} className="ic-hoja" style={retardo(retardos[indice]!)}>
                          <g transform={transformarHoja(hoja)}>
                            <path fill={degradado} d={HOJA} />
                          </g>
                        </g>
                      ))}
                    </g>
                  </g>
                ))}
                <g className="ic-sello">
                  <g className="ic-herida">
                    {(
                      [
                        ['chi-grueso', CHI_GRUESO, 'a'],
                        ['chi-fino', CHI_FINO, 'b'],
                      ] as const
                    ).map(([clase, chi, mascara]) => (
                      <g key={clase} className={clase} mask={`url(#${base}-${mascara})`} fill={degradado}>
                        <path d={chi.trazo} />
                        {chi.remates.map((remate) => (
                          <rect key={remate.x} {...remate} />
                        ))}
                      </g>
                    ))}
                  </g>
                </g>
                <line className="ic-tajo ic-tajo-1" x1="18.4" y1="13" x2="45.6" y2="51" strokeWidth="1.1" />
                <line className="ic-tajo ic-tajo-2" x1="45.6" y1="13" x2="18.4" y2="51" strokeWidth="1.1" />
                {CHISPAS.map(([cx, cy, dx, dy, s]) => (
                  <circle key={`${cx}-${cy}-${s}`} className="ic-chispa" cx={cx} cy={cy} r="0.9" style={desvio(dx, dy, s)} />
                ))}
              </svg>
            </m.div>
          ) : (
            <div className="ic-logo" />
          )}
        </div>
        <p className="ic-marca">
          {[...'CHRONO'].map((letra, indice) => (
            <span key={indice} className="ic-letra" style={{ '--d': indice - 2.5 } as CSSProperties}>
              {letra}
            </span>
          ))}
        </p>
      </div>
      <button
        type="button"
        className="ic-saltar"
        onClick={(evento) => {
          evento.stopPropagation();
          saltar();
        }}
      >
        Saltar
      </button>
    </div>
  );
}
