import type { ReactNode } from 'react';

export function EstadoVacio({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-gym border border-dashed border-borde bg-superficie px-4 py-10 text-center">
      <h2 className="text-lg font-semibold text-texto">{titulo}</h2>
      <p className="mt-1 text-sm text-texto-suave">{descripcion}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
