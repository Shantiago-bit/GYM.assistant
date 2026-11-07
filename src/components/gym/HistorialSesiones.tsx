import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { Insignia } from '@/components/ui/Insignia';
import { Tarjeta } from '@/components/ui/Tarjeta';
import type { Serie, Sesion } from '@/lib/dataService';
import { formatearFecha, formatearPeso } from '@/lib/formato';
import { repsTotales, textoTipoSerie } from '@/lib/reglas/tecnicas';

// " + 3 + 2 (17 en total)" o, en drop set, " → 30 kg × 6 → 20 kg × 5".
function textoMiniSeries(serie: Serie): string {
  const extras = serie.extras ?? [];
  if (extras.length === 0) return '';

  if (serie.tipoSerie === 'drop_set') {
    return extras
      .map((extra) => ` → ${extra.pesoGramos == null ? '' : `${formatearPeso(extra.pesoGramos)} × `}${extra.reps}`)
      .join('');
  }
  return `${extras.map((extra) => ` + ${extra.reps}`).join('')} (${repsTotales(serie)} en total)`;
}

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
    <ol className="grid gap-3 xl:grid-cols-2">
      {sesiones.map((sesion) => (
        <li key={sesion.id}>
          <Tarjeta className="h-full">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-texto">{formatearFecha(sesion.fecha)}</h3>
              {sesion.esPrueba ? <Insignia>Prueba inicial</Insignia> : null}
            </div>
            <ul className="mt-2 space-y-1 text-sm tabular-nums text-texto">
              {sesion.series.map((serie) => (
                <li key={serie.numero} className="flex justify-between gap-3">
                  <span className="flex items-center gap-2 text-texto-suave">
                    Serie {serie.numero}
                    {serie.tipoSerie && serie.tipoSerie !== 'normal' ? (
                      <span className="rounded-full border border-borde px-2 py-0.5 text-xs">
                        {textoTipoSerie(serie.tipoSerie)}
                      </span>
                    ) : null}
                  </span>
                  <span>
                    {serie.reps} reps
                    {serie.pesoGramos === null ? '' : ` · ${formatearPeso(serie.pesoGramos)}`}
                    {serie.rir === null || serie.rir === undefined ? '' : ` · RIR ${serie.rir}`}
                    {textoMiniSeries(serie)}
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
