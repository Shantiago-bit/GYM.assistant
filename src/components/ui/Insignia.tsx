import type { ReactNode } from 'react';

type Tono = 'neutro' | 'peso' | 'calistenia' | 'subir' | 'mantener';

const PUNTOS: Record<Tono, string> = {
  neutro: 'bg-borde',
  peso: 'bg-peso',
  calistenia: 'bg-calistenia',
  subir: 'bg-subir',
  mantener: 'bg-mantener',
};

export function Insignia({ tono = 'neutro', children }: { tono?: Tono; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-borde bg-superficie px-2.5 py-0.5 text-xs font-semibold text-texto">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${PUNTOS[tono]}`} />
      {children}
    </span>
  );
}
