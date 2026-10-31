import { Insignia } from '@/components/ui/Insignia';
import type { IndicadorProgreso as Indicador, SerieMedida } from '@/lib/dataService';
import { formatearPeso } from '@/lib/formato';

const TEXTOS: Record<Indicador, string> = {
  mejora: 'Mejora',
  estable: 'Estable',
  baja: 'Baja',
};

export function IndicadorProgreso({ indicador }: { indicador: Indicador }) {
  return (
    <Insignia tono={indicador === 'mejora' ? 'subir' : 'mantener'}>{TEXTOS[indicador]}</Insignia>
  );
}

export function textoSerie(serie: SerieMedida): string {
  return serie.pesoGramos === null
    ? `${serie.reps} reps`
    : `${serie.reps} reps · ${formatearPeso(serie.pesoGramos)}`;
}
