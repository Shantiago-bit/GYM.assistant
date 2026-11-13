import type { ButtonHTMLAttributes } from 'react';

type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-primario text-white hover:brightness-95',
  secundario: 'border border-borde bg-superficie text-texto hover:bg-primario-suave',
  peligro: 'bg-red-700 text-white hover:bg-red-800',
  fantasma: 'text-texto-suave hover:bg-primario-suave hover:text-texto',
};

export function clasesBoton(variante: Variante = 'primario'): string {
  return `inline-flex min-h-11 items-center justify-center rounded-gym px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario disabled:cursor-not-allowed disabled:border-borde disabled:bg-borde disabled:text-texto-suave disabled:brightness-100 ${VARIANTES[variante]}`;
}

interface PropiedadesBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  cargando?: boolean;
}

export function Boton({
  variante = 'primario',
  cargando = false,
  disabled,
  type = 'button',
  className = '',
  children,
  ...resto
}: PropiedadesBoton) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando}
      className={`${clasesBoton(variante)} ${className}`}
      {...resto}
    >
      {cargando ? 'Guardando...' : children}
    </button>
  );
}
