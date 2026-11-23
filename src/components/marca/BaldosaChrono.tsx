import { Baldosa } from './Baldosa';
import { TAMANOS_BALDOSA, type TamanoBaldosa } from './BaldosaAgon';
import { SimboloChrono } from './SimboloChrono';

// La baldosa compartida con el símbolo de CHRONO al 70 %, como la de Agón. Tamaños sm 32, md 44, lg 72 y xl 320.
export function BaldosaChrono({
  tamano = 'md',
  titulo,
  className,
}: {
  tamano?: TamanoBaldosa;
  titulo?: string | undefined;
  className?: string | undefined;
}) {
  const lado = TAMANOS_BALDOSA[tamano];
  return (
    <Baldosa tamano={lado} className={className}>
      <SimboloChrono tamano={Math.round(lado * 0.7)} titulo={titulo} />
    </Baldosa>
  );
}
