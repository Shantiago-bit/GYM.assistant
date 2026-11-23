import { LEMA, LOGOTIPO, NOMBRE_APP } from '@/lib/config/marca';
import { BaldosaAgon, type TamanoBaldosa } from './BaldosaAgon';

// Tamaño de la palabra «AGÓN» según la baldosa que la acompaña.
const TEXTO: Record<TamanoBaldosa, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
  xl: 'text-6xl',
};

// La baldosa con el escudo y «AGÓN» en Cinzel. La baldosa es decorativa: el nombre lo lee el texto, que se anuncia
// como «Agón» (los lectores deletrean las mayúsculas sostenidas).
export function LogotipoAgon({
  variante = 'horizontal',
  tamano = 'sm',
  conLema = false,
  className = '',
}: {
  variante?: 'horizontal' | 'apilada';
  tamano?: TamanoBaldosa;
  conLema?: boolean;
  className?: string;
}) {
  const apilada = variante === 'apilada';
  return (
    <span
      className={`inline-flex ${apilada ? 'flex-col items-center gap-3 text-center' : 'items-center gap-2.5'} ${className}`}
      data-variante={variante}
    >
      <BaldosaAgon tamano={tamano} />
      <span className={`flex flex-col ${apilada ? 'items-center gap-1' : 'gap-0.5'}`}>
        <span className={`font-marca font-bold leading-none tracking-[0.14em] text-texto ${TEXTO[tamano]}`}>
          <span aria-hidden="true">{LOGOTIPO}</span>
          <span className="sr-only">{NOMBRE_APP}</span>
        </span>
        {conLema && <span className="text-sm tracking-[0.08em] text-texto-suave">{LEMA}</span>}
      </span>
    </span>
  );
}
