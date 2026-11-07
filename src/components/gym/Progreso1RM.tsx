import { Grafico1RM } from '@/components/gym/Grafico1RM';
import { Tarjeta } from '@/components/ui/Tarjeta';
import type { Sesion } from '@/lib/dataService';
import { formatearPeso } from '@/lib/formato';
import { serie1RM } from '@/lib/reglas/fuerza';

export function Progreso1RM({ sesiones }: { sesiones: Sesion[] }) {
  // listarSesiones entrega de la más reciente a la más antigua.
  const puntos = serie1RM([...sesiones].reverse());

  if (puntos.length === 0) {
    return null;
  }

  const actual = puntos.at(-1)!.gramos;
  const inicial = puntos[0]!.gramos;
  const mejor = Math.max(...puntos.map((punto) => punto.gramos));
  const cambio = actual - inicial;

  return (
    <section aria-labelledby="titulo-1rm">
      <h2 id="titulo-1rm" className="mb-3 mt-8 text-lg font-semibold text-texto">
        1RM estimado
      </h2>
      <Tarjeta>
        <div className="mb-3 flex flex-wrap items-end gap-x-6 gap-y-2">
          <div>
            <p className="text-3xl font-bold tabular-nums text-texto">{formatearPeso(actual)}</p>
            <p className="text-xs text-texto-suave">Última sesión</p>
          </div>
          <div>
            <p className="text-base font-semibold tabular-nums text-texto">{formatearPeso(mejor)}</p>
            <p className="text-xs text-texto-suave">Mejor marca</p>
          </div>
          {puntos.length > 1 ? (
            <div>
              <p className="text-base font-semibold tabular-nums text-texto">
                {cambio > 0 ? '+' : cambio < 0 ? '−' : ''}
                {formatearPeso(Math.abs(cambio))}
              </p>
              <p className="text-xs text-texto-suave">Desde la prueba inicial</p>
            </div>
          ) : null}
        </div>

        {puntos.length > 1 ? (
          <Grafico1RM puntos={puntos} />
        ) : (
          <p className="text-sm text-texto-suave">Registra más sesiones para ver la evolución.</p>
        )}

        <p className="mt-3 text-xs text-texto-suave">
          Estimación con la fórmula de Epley sobre la mejor serie de cada sesión. Si anotas el RIR, se cuentan las
          repeticiones que te quedaban.
        </p>
      </Tarjeta>
    </section>
  );
}
