'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { useNivelMovimiento } from '@/components/ui/ProveedorMovimiento';
import { etiquetaLlama, estadoLlama } from '@/lib/reglas/llama';

const CLAVE_RACHA_VISTA = 'agon_racha_vista';

// Chispas: posición de salida, desvío y ritmo distintos para que no suban todas juntas.
const CHISPAS = [
  { x: 26, dx: -6, retardo: 0, duracion: 1.6 },
  { x: 38, dx: 5, retardo: 0.7, duracion: 1.9 },
  { x: 32, dx: -2, retardo: 1.3, duracion: 1.5 },
  { x: 22, dx: -8, retardo: 0.4, duracion: 2.1 },
  { x: 42, dx: 7, retardo: 1.0, duracion: 1.7 },
];

// La llama de la racha: SVG propio de tres capas (exterior, media y núcleo) que "bailan" con keyframes CSS (no JS),
// chispas que suben y, desde 7 días, un halo que respira. Solo se mueve en el nivel "Completas", en pantalla y con
// la pestaña visible; en los demás niveles es una imagen fija. Con `celebrar`, si la racha subió desde la última
// vez que se vio, crece con un resorte y suelta una ráfaga de chispas.
export function Llama({
  racha,
  tamano = 24,
  enRiesgo = false,
  celebrar = false,
  decorativa = false,
  className = '',
}: {
  racha: number;
  tamano?: number;
  enRiesgo?: boolean;
  celebrar?: boolean;
  decorativa?: boolean;
  className?: string;
}) {
  const estado = estadoLlama(racha, enRiesgo);
  // Fuera de "Completas" (o con movimiento reducido en el sistema) es una imagen fija.
  const { nivel } = useNivelMovimiento();
  const estatica = nivel !== 'completas';
  // Las chispas son de al menos 1,4 px en pantalla, también en una llama de 18 px (en unidades del viewBox).
  const radioChispa = Math.max(1.6, Math.round(((1.4 * 64) / tamano) * 10) / 10);
  const id = `llama-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(true);
  const [crece, setCrece] = useState(false);

  // Pausa fuera de pantalla y con la pestaña oculta.
  useEffect(() => {
    const elemento = ref.current;
    let enPantalla = true;
    const actualizar = () => setVisible(enPantalla && document.visibilityState !== 'hidden');
    let observador: IntersectionObserver | null = null;
    if (elemento && typeof IntersectionObserver !== 'undefined') {
      observador = new IntersectionObserver((entradas) => {
        enPantalla = entradas.some((entrada) => entrada.isIntersecting);
        actualizar();
      });
      observador.observe(elemento);
    }
    document.addEventListener('visibilitychange', actualizar);
    return () => {
      observador?.disconnect();
      document.removeEventListener('visibilitychange', actualizar);
    };
  }, []);

  // La racha subió desde la última visita (la primera sesión del día): crece y suelta chispas una vez.
  useEffect(() => {
    if (!celebrar) return undefined;
    let anterior: number | null = null;
    try {
      const guardado = window.localStorage.getItem(CLAVE_RACHA_VISTA);
      anterior = guardado === null ? null : Number(guardado);
      window.localStorage.setItem(CLAVE_RACHA_VISTA, String(racha));
    } catch {
      return undefined;
    }
    if (anterior === null || racha <= anterior) return undefined;
    setCrece(true);
    const t = setTimeout(() => setCrece(false), 1400);
    return () => clearTimeout(t);
  }, [celebrar, racha]);

  const accesible = decorativa ? { 'aria-hidden': true as const } : { role: 'img', 'aria-label': etiquetaLlama(racha) };

  return (
    <span
      ref={ref}
      {...accesible}
      className={`llama inline-block shrink-0 align-middle ${className}`}
      data-intensidad={estado.intensidad}
      data-pausada={visible ? undefined : ''}
      data-crece={crece && !estatica ? '' : undefined}
      data-estatica={estatica ? '' : undefined}
      data-en-riesgo={enRiesgo ? '' : undefined}
      style={{ width: tamano, height: tamano * 1.25, '--escala-llama': estado.escala } as CSSProperties}
    >
      <svg viewBox="0 0 64 80" width="100%" height="100%" aria-hidden="true" className="overflow-visible">
        <defs>
          <linearGradient id={`${id}-ext`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" style={{ stopColor: 'var(--llama-base)' }} />
            <stop offset="0.35" style={{ stopColor: 'var(--llama-coral)' }} />
            <stop offset="1" style={{ stopColor: 'var(--llama-ambar)' }} />
          </linearGradient>
          <linearGradient id={`${id}-med`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" style={{ stopColor: 'var(--llama-coral)' }} />
            <stop offset="1" style={{ stopColor: 'var(--llama-ambar-claro)' }} />
          </linearGradient>
          <linearGradient id={`${id}-nuc`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" style={{ stopColor: 'var(--llama-ambar-claro)' }} />
            <stop offset="1" style={{ stopColor: 'var(--llama-nucleo)' }} />
          </linearGradient>
        </defs>
        {estado.halo ? <circle className="llama-halo" cx="32" cy="50" r="30" /> : null}
        <g className="llama-escala">
          <ellipse className="llama-base" cx="32" cy="75" rx="15" ry="3.5" />
          <path
            className="llama-capa llama-exterior"
            fill={`url(#${id}-ext)`}
            d="M32 4C36 18 52 28 52 48C52 64 43 76 32 76C21 76 12 64 12 48C12 36 20 30 22 20C26 28 28 30 30 30C30 22 28 14 32 4Z"
          />
          <path
            className="llama-capa llama-media"
            fill={`url(#${id}-med)`}
            d="M32 22C35 32 44 38 44 52C44 64 39 72 32 72C25 72 20 64 20 54C20 46 25 42 27 36C29 41 30 42 31 42C31 36 30 30 32 22Z"
          />
          <path
            className="llama-capa llama-nucleo"
            fill={`url(#${id}-nuc)`}
            d="M32 40C34 46 38 50 38 58C38 66 35 70 32 70C29 70 26 66 26 59C26 53 30 50 32 40Z"
          />
        </g>
        {CHISPAS.slice(0, estado.chispas).map((chispa, indice) => (
          <circle
            key={indice}
            className="llama-chispa"
            cx={chispa.x}
            cy="30"
            r={radioChispa}
            style={{ '--dx': `${chispa.dx}px`, animationDelay: `${chispa.retardo}s`, animationDuration: `${chispa.duracion}s` } as CSSProperties}
          />
        ))}
        {/* La ráfaga al subir la racha: 6 chispas que salen a la vez. */}
        {crece
          ? CHISPAS.concat(CHISPAS.slice(0, 1)).map((chispa, indice) => (
              <circle
                key={`rafaga-${indice}`}
                className="llama-rafaga"
                cx="32"
                cy="36"
                r={radioChispa * 1.1}
                style={{ '--dx': `${(indice - 2.5) * 9}px` } as CSSProperties}
              />
            ))
          : null}
      </svg>
    </span>
  );
}
