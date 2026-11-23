import type { ReactNode } from 'react';

// La baldosa de los logos: fondo radial morado (--marca-baldosa), borde (--marca-baldosa-borde), esquinas del 24 % del tamaño y un
// resplandor que crece con ella. Es decorativa: el nombre lo da el símbolo o el texto que la acompaña.
export function Baldosa({ tamano, children, className = '' }: { tamano: number; children: ReactNode; className?: string | undefined }) {
  const anillo = Math.max(1, Math.round(tamano * 0.03));
  return (
    <span
      className={`baldosa-marca inline-flex shrink-0 items-center justify-center ${className}`}
      style={{
        width: tamano,
        height: tamano,
        borderRadius: Math.round(tamano * 0.24),
        boxShadow: `0 0 0 ${anillo}px var(--marca-resplandor-anillo), 0 ${Math.round(tamano * 0.12)}px ${Math.round(tamano * 0.28)}px var(--marca-resplandor)`,
      }}
    >
      {children}
    </span>
  );
}
