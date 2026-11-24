import { useId } from 'react';
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
import type { VarianteSimbolo } from './SimboloKairos';

// El símbolo de CHRONO (Doc/marca/chrono/chrono-simbolo.svg y chrono-simbolo-mono.svg): laurel y letra griega Χ.
// Solo de CHRONO: nunca como favicon ni ícono de la app, que son de Kairós. Con `titulo` es una imagen con nombre;
// sin él, decorativo. Las partes llevan las clases laurel-izquierdo, laurel-derecho, chi-grueso y chi-fino.
export function SimboloChrono({
  variante = 'degradado',
  tamano = 24,
  titulo,
  className,
}: {
  variante?: VarianteSimbolo;
  tamano?: number;
  titulo?: string | undefined;
  className?: string | undefined;
}) {
  // Un id por instancia para el degradado y para la hoja reutilizada con <use> (sin caracteres que rompan url(#…)).
  const base = `chrono-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const idDegradado = `${base}-degradado`;
  const idHoja = `${base}-hoja`;
  const pintura = variante === 'degradado' ? `url(#${idDegradado})` : 'currentColor';
  const accesible = titulo ? { role: 'img', 'aria-label': titulo } : { 'aria-hidden': true as const };

  return (
    <svg
      {...accesible}
      width={tamano}
      height={tamano}
      viewBox="0 0 64 64"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      data-variante={variante}
    >
      <defs>
        {variante === 'degradado' && (
          <linearGradient id={idDegradado} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0" style={{ stopColor: 'var(--marca-degradado-1)' }} />
            <stop offset="0.55" style={{ stopColor: 'var(--marca-degradado-2)' }} />
            <stop offset="1" style={{ stopColor: 'var(--marca-degradado-3)' }} />
          </linearGradient>
        )}
        <path id={idHoja} d={HOJA} />
      </defs>
      {(
        [
          ['laurel-izquierdo', RAMA_IZQUIERDA, HOJAS_IZQUIERDA],
          ['laurel-derecho', RAMA_DERECHA, HOJAS_DERECHA],
        ] as const
      ).map(([clase, rama, hojas]) => (
        <g key={clase} className={clase}>
          <path d={rama} stroke={pintura} strokeWidth="2.2" />
          <g fill={pintura}>
            {hojas.map((hoja) => (
              <use key={hoja.join()} href={`#${idHoja}`} transform={transformarHoja(hoja)} />
            ))}
          </g>
        </g>
      ))}
      {(
        [
          ['chi-grueso', CHI_GRUESO],
          ['chi-fino', CHI_FINO],
        ] as const
      ).map(([clase, chi]) => (
        <g key={clase} className={clase} fill={pintura}>
          <path d={chi.trazo} />
          {chi.remates.map((remate) => (
            <rect key={remate.x} {...remate} />
          ))}
        </g>
      ))}
    </svg>
  );
}
