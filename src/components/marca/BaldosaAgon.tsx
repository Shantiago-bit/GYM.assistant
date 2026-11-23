import { Baldosa } from './Baldosa';
import { SimboloAgon } from './SimboloAgon';

export const TAMANOS_BALDOSA = { sm: 32, md: 44, lg: 72, xl: 320 } as const;
export type TamanoBaldosa = keyof typeof TAMANOS_BALDOSA;

// El símbolo ocupa el 70 % de la baldosa, como en el ícono de la app (Doc/marca/agon/agon-icono-app.svg).
export function BaldosaAgon({ tamano = 'md', titulo, className }: { tamano?: TamanoBaldosa; titulo?: string; className?: string }) {
  const lado = TAMANOS_BALDOSA[tamano];
  return (
    <Baldosa tamano={lado} className={className}>
      <SimboloAgon tamano={Math.round(lado * 0.7)} titulo={titulo} />
    </Baldosa>
  );
}
