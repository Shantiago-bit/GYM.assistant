import type { HTMLAttributes } from 'react';

const VARIANTES = {
  normal: 'border-borde bg-superficie',
  destacada: 'border-borde bg-primario-suave',
} as const;

export function Tarjeta({
  className = '',
  variante = 'normal',
  children,
  ...resto
}: HTMLAttributes<HTMLDivElement> & { variante?: keyof typeof VARIANTES }) {
  return (
    <div className={`rounded-tarjeta border p-4 shadow-suave ${VARIANTES[variante]} ${className}`} {...resto}>
      {children}
    </div>
  );
}
