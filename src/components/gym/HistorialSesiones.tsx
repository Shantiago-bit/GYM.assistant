import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { Insignia } from '@/components/ui/Insignia';
import { Tarjeta } from '@/components/ui/Tarjeta';
import type { Sesion } from '@/lib/dataService';
import { formatearFecha, formatearPeso } from '@/lib/formato';

export function HistorialSesiones({ sesiones }: { sesiones: Sesion[] }) {
  if (sesiones.length === 0) {
    return (
      <EstadoVacio
        titulo="Sin sesiones todavía"
        descripcion="Tu histórico aparecerá aquí cuando registres la prueba inicial."
      />
    );
  }

  return (
    <ol className="space-y-3">
      {sesiones.map((sesion) => (
        <li key={sesion.id}>
          <Tarjeta>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-texto">{formatearFecha(sesion.fecha)}</h3>
              {sesion.esPrueba ? <Insignia>Prueba inicial</Insignia> : null}
            </div>
            <ul className="mt-2 space-y-1 text-sm tabular-nums text-texto">
              {sesion.series.map((serie) => (
                <li key={serie.numero} className="flex justify-between gap-3">
                  <span className="text-texto-suave">Serie {serie.numero}</span>
                  <span>
                    {serie.reps} reps
                    {serie.pesoGramos === null ? '' : ` · ${formatearPeso(serie.pesoGramos)}`}
                    {serie.rir === null || serie.rir === undefined ? '' : ` · RIR ${serie.rir}`}
                  </span>
                </li>
              ))}
            </ul>
          </Tarjeta>
        </li>
      ))}
    </ol>
  );
}
