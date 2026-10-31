import type { HTMLAttributes } from 'react';

export function Tarjeta({ className = '', children, ...resto }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-gym border border-borde bg-superficie p-4 ${className}`} {...resto}>
      {children}
    </div>
  );
}
