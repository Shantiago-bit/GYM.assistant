import { Insignia } from '@/components/ui/Insignia';
import type { TipoEjercicio } from '@/lib/reglas/ejercicio';

export function InsigniaTipo({ tipo }: { tipo: TipoEjercicio }) {
  return <Insignia tono={tipo}>{tipo === 'peso' ? 'Peso' : 'Calistenia'}</Insignia>;
}
