import { Insignia } from '@/components/ui/Insignia';
import { Tarjeta } from '@/components/ui/Tarjeta';
import type { Recomendacion } from '@/lib/dataService';
import { formatearPeso } from '@/lib/formato';

function titulo(recomendacion: Recomendacion): string {
  switch (recomendacion.accion) {
    case 'subir_peso':
      return `Subir el peso a ${formatearPeso(recomendacion.pesoSugeridoGramos ?? 0)}`;
    case 'subir_reps':
      return `Subir la meta a ${recomendacion.metaRepsSugerida} repeticiones`;
    case 'subir_variante':
      return 'Probar una variante más difícil';
    case 'mantener':
      return 'Mantener el objetivo';
  }
}

export function TarjetaRecomendacion({
  recomendacion,
  sinPrueba,
}: {
  recomendacion: Recomendacion;
  sinPrueba: boolean;
}) {
  const sube = !sinPrueba && recomendacion.accion !== 'mantener';

  return (
    <Tarjeta className={`border-l-4 ${sube ? 'border-l-subir' : 'border-l-mantener'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-texto-suave">Próxima sesión</p>
        <Insignia tono={sube ? 'subir' : 'mantener'}>
          {sinPrueba ? 'Pendiente' : sube ? 'Subir' : 'Mantener'}
        </Insignia>
      </div>
      <h2 className="mt-2 text-xl font-bold text-texto">
        {sinPrueba ? 'Falta la prueba inicial' : titulo(recomendacion)}
      </h2>
      <p className="mt-1 text-sm text-texto-suave">{recomendacion.mensaje}</p>
    </Tarjeta>
  );
}
