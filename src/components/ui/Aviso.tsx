import type { ReactNode } from 'react';

type TipoAviso = 'info' | 'exito' | 'advertencia' | 'error';

const ESTILOS: Record<TipoAviso, string> = {
  info: 'border-borde bg-primario-suave text-texto',
  exito: 'border-exito bg-exito-suave text-exito',
  advertencia: 'border-aviso bg-aviso-suave text-aviso',
  error: 'border-peligro bg-peligro-suave text-peligro',
};

export function Aviso({ tipo = 'info', children }: { tipo?: TipoAviso; children: ReactNode }) {
  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      className={`anim-entrada-escala rounded-boton border px-3 py-2 text-sm ${ESTILOS[tipo]}`}
    >
      {children}
    </div>
  );
}
