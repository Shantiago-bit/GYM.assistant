import { useId } from 'react';

export type VarianteSimbolo = 'degradado' | 'mono';

// El escudo de Agón con la barra de pesas (Doc/marca/agon/agon-simbolo.svg y agon-simbolo-mono.svg). El escudo es
// solo de Agón; CHRONO tiene su propio símbolo. Con `titulo` es una imagen con nombre; sin él, decorativo.
export function SimboloAgon({
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
  // useId da ids con caracteres que no sirven dentro de url(#…): se dejan solo letras, números, - y _.
  const id = `agon-degradado-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const pintura = variante === 'degradado' ? `url(#${id})` : 'currentColor';
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
      {variante === 'degradado' && (
        <defs>
          <linearGradient id={id} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0" style={{ stopColor: 'var(--marca-degradado-1)' }} />
            <stop offset="0.55" style={{ stopColor: 'var(--marca-degradado-2)' }} />
            <stop offset="1" style={{ stopColor: 'var(--marca-degradado-3)' }} />
          </linearGradient>
        </defs>
      )}
      <circle cx="32" cy="32" r="21" stroke={pintura} strokeWidth="3.2" />
      <circle cx="32" cy="32" r="15" stroke={pintura} strokeWidth="1.4" />
      <path d="M5 32H59" stroke={pintura} strokeWidth="2.8" />
      <rect x="11" y="23" width="5" height="18" rx="1.2" fill={pintura} />
      <rect x="48" y="23" width="5" height="18" rx="1.2" fill={pintura} />
      <rect x="6.5" y="26.5" width="3.5" height="11" rx="1" fill={pintura} />
      <rect x="54" y="26.5" width="3.5" height="11" rx="1" fill={pintura} />
    </svg>
  );
}
