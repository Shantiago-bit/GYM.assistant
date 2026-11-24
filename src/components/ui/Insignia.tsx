import type { ReactNode } from 'react';

type Tono = 'neutro' | 'peso' | 'calistenia' | 'subir' | 'mantener';

const PUNTOS: Record<Tono, string> = {
  neutro: 'bg-borde',
  peso: 'bg-peso',
  calistenia: 'bg-calistenia',
  subir: 'bg-subir',
  mantener: 'bg-mantener',
};

// En el nivel "Completas" la insignia entra con un pequeño salto y la de "subir" lleva una flecha que sube en bucle
// suave (globals.css: .insignia-salta y .flecha-sube); en los demás niveles, quietas.
export function Insignia({ tono = 'neutro', children }: { tono?: Tono; children: ReactNode }) {
  return (
    <span className="insignia-salta inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-borde bg-superficie px-2.5 py-0.5 text-sm font-semibold text-texto">
      {tono === 'subir' ? (
        <svg aria-hidden="true" viewBox="0 0 12 12" className="flecha-sube h-3 w-3 text-subir" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 10V2M2.5 5.5L6 2l3.5 3.5" />
        </svg>
      ) : (
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${PUNTOS[tono]}`} />
      )}
      {children}
    </span>
  );
}
