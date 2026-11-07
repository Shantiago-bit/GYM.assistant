import { IndicadorProgreso, textoSerie } from '@/components/gym/IndicadorProgreso';
import { Tarjeta } from '@/components/ui/Tarjeta';
import type { Sesion } from '@/lib/dataService';
import { formatearFecha } from '@/lib/formato';
import { tendenciaDeSesiones } from '@/lib/reglas/tendencia';

export function TendenciaProgreso({ sesiones }: { sesiones: Sesion[] }) {
  // listarSesiones entrega de la más reciente a la más antigua.
  const puntos = tendenciaDeSesiones([...sesiones].reverse());

  if (puntos.length < 2) {
    return null;
  }

  return (
    <section aria-labelledby="titulo-tendencia">
      <h2 id="titulo-tendencia" className="mb-3 text-lg font-semibold text-texto">
        Tendencia
      </h2>
      <Tarjeta>
        <p className="mb-2 text-sm text-texto-suave">Mejor serie de cada sesión.</p>
        <ol className="divide-y divide-borde">
          {puntos.map((punto, indice) => (
            <li
              key={`${punto.fecha}-${indice}`}
              className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
            >
              <span className="text-texto-suave">{formatearFecha(punto.fecha)}</span>
              <span className="flex items-center gap-2 tabular-nums text-texto">
                {textoSerie(punto.mejor)}
                {punto.indicador ? <IndicadorProgreso indicador={punto.indicador} /> : null}
              </span>
            </li>
          ))}
        </ol>
      </Tarjeta>
    </section>
  );
}
