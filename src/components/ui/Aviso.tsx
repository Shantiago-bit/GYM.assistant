import type { ReactNode } from 'react';

type TipoAviso = 'info' | 'exito' | 'advertencia' | 'error';

const ESTILOS: Record<TipoAviso, string> = {
  info: 'border-borde bg-primario-suave text-texto',
  exito: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  advertencia: 'border-amber-300 bg-amber-50 text-amber-900',
  error: 'border-red-300 bg-red-50 text-red-900',
};

export function Aviso({ tipo = 'info', children }: { tipo?: TipoAviso; children: ReactNode }) {
  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      className={`rounded-gym border px-3 py-2 text-sm ${ESTILOS[tipo]}`}
    >
      {children}
    </div>
  );
}
