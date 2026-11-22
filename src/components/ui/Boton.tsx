import type { ButtonHTMLAttributes } from 'react';

type Variante = 'primario' | 'secundario' | 'suave' | 'peligro' | 'fantasma';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-primario text-white shadow-suave hover:bg-primario-fuerte active:bg-primario-fuerte',
  secundario: 'border border-borde bg-superficie text-texto hover:border-primario hover:bg-primario-suave active:bg-primario-suave',
  suave: 'bg-primario-suave text-primario-fuerte hover:bg-borde active:bg-borde',
  peligro: 'bg-peligro text-white hover:brightness-90 active:brightness-90',
  fantasma: 'text-texto-suave hover:bg-primario-suave hover:text-texto active:bg-borde',
};

export function clasesBoton(variante: Variante = 'primario'): string {
  return `inline-flex min-h-11 items-center justify-center rounded-boton px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario disabled:cursor-not-allowed disabled:border-borde disabled:bg-borde disabled:text-texto-suave disabled:shadow-none disabled:brightness-100 ${VARIANTES[variante]}`;
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
