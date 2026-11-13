import { Grafico1RM } from '@/components/gym/Grafico1RM';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { Termino } from '@/components/ui/Termino';
import type { Sesion } from '@/lib/dataService';
import { formatearPeso } from '@/lib/formato';
import { serie1RM } from '@/lib/reglas/fuerza';

// Modo sencillo: "Peso máximo estimado" en lugar de "1RM estimado".
export function Progreso1RM({ sesiones, avanzado = false }: { sesiones: Sesion[]; avanzado?: boolean }) {
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
    <section aria-labelledby="titulo-1rm" data-guia="detalle-1rm">
      <h2 id="titulo-1rm" className="mb-3 flex items-center text-lg font-semibold text-texto">
        {avanzado ? (
          <Termino id="unorm">1RM estimado</Termino>
        ) : (
          'Peso máximo estimado'
        )}
      </h2>
      <Tarjeta>
        <div className="mb-3 flex flex-wrap items-end gap-x-6 gap-y-2">
          <div>
            <p className="text-3xl font-bold tabular-nums text-texto">{formatearPeso(actual)}</p>
            <p className="text-sm text-texto-suave">Última sesión</p>
          </div>
          <div>
            <p className="text-base font-semibold tabular-nums text-texto">{formatearPeso(mejor)}</p>
            <p className="text-sm text-texto-suave">Mejor marca</p>
          </div>
          {puntos.length > 1 ? (
            <div>
              <p className="text-base font-semibold tabular-nums text-texto">
                {cambio > 0 ? '+' : cambio < 0 ? '−' : ''}
                {formatearPeso(Math.abs(cambio))}
              </p>
              <p className="text-sm text-texto-suave">{avanzado ? 'Desde la prueba inicial' : 'Desde la primera medición'}</p>
            </div>
          ) : null}
        </div>

        {puntos.length > 1 ? (
          <Grafico1RM puntos={puntos} titulo={avanzado ? '1RM estimado' : 'Peso máximo estimado'} />
        ) : (
          <p className="text-sm text-texto-suave">Registra más sesiones para ver la evolución.</p>
        )}

        <p className="mt-3 text-sm text-texto-suave">
          {avanzado
            ? 'Estimación con la fórmula de Epley sobre la mejor serie de cada sesión. Si anotas el RIR, se cuentan las repeticiones que te quedaban.'
            : 'El peso más alto que podrías levantar una sola vez, calculado con tu mejor serie de cada día. Si sube, estás progresando.'}
        </p>
      </Tarjeta>
    </section>
  );
}
