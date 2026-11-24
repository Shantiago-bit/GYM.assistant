import type { CSSProperties } from 'react';

export type EstadoMancuerna = 'quieta' | 'levanta' | 'esfuerzo' | 'listo' | 'record' | 'respira';

// Ilustración propia en la paleta morada: una barra con discos (ejercicios con peso) o unas anillas con un
// destello (calistenia). Las animaciones son CSS según `estado` (globals.css, sección "Mancuerna") y solo corren
// en el nivel "Completas"; en los demás niveles es una imagen fija. Siempre decorativa (aria-hidden): lo que pasa
// lo dicen los textos de la pantalla.
export function Mancuerna({
  estado = 'quieta',
  variante = 'pesa',
  tamano = 40,
  className = '',
  style,
}: {
  estado?: EstadoMancuerna;
  variante?: 'pesa' | 'anillas';
  tamano?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={`mancuerna inline-block shrink-0 ${className}`}
      data-estado={estado}
      data-variante={variante}
      style={{ width: tamano, height: tamano / 2, ...style }}
    >
      <svg aria-hidden="true" viewBox="0 0 64 32" width="100%" height="100%" className="overflow-visible">
        <circle className="mancuerna-destello" cx="32" cy="16" r="14" />
        {variante === 'pesa' ? (
          <g className="mancuerna-cuerpo">
            <rect className="mancuerna-barra" x="6" y="14.5" width="52" height="3" rx="1.5" />
            <g className="mancuerna-disco mancuerna-disco-i">
              <rect x="11" y="6" width="6" height="20" rx="1.6" />
              <rect x="6" y="9" width="4.5" height="14" rx="1.2" />
            </g>
            <g className="mancuerna-disco mancuerna-disco-d">
              <rect x="47" y="6" width="6" height="20" rx="1.6" />
              <rect x="53.5" y="9" width="4.5" height="14" rx="1.2" />
            </g>
            {/* El disco extra de un récord: cae y queda cargado en la barra. */}
            <rect className="mancuerna-extra" x="1" y="10.5" width="4" height="11" rx="1" />
          </g>
        ) : (
          <g className="mancuerna-cuerpo">
            <path className="mancuerna-correa" d="M20 0V13M44 0V13" />
            <circle className="mancuerna-anilla" cx="20" cy="20" r="7" />
            <circle className="mancuerna-anilla" cx="44" cy="20" r="7" />
            <path className="mancuerna-chispa" d="M32 9v5M29.5 11.5h5" />
          </g>
        )}
      </svg>
    </span>
  );
}
