'use client';

import { useId } from 'react';
import type { PuntoGrafico } from './GraficoArea';
import { TablaDatos } from './TablaDatos';

const ANCHO = 120;
const ALTO = 40;

// Mini gráfico de barras para las tarjetas de indicadores. Con `tabla`, incluye la tabla alternativa; si no,
// el resumen en texto (descripcion) basta, porque la cifra principal ya está en la tarjeta.
export function MiniBarras({
  titulo,
  descripcion,
  puntos,
  color = 'var(--color-primario)',
  tabla = false,
  nombreValor = 'Valor',
}: {
  titulo: string;
  descripcion: string;
  puntos: PuntoGrafico[];
  color?: string;
  tabla?: boolean;
  nombreValor?: string;
}) {
  const idDescripcion = useId();
  const mayor = Math.max(1, ...puntos.map((punto) => punto.valor));
  const ancho = ANCHO / Math.max(puntos.length, 1);

  return (
    <div>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="none" className="block h-10 w-full" role="img" aria-label={titulo} aria-describedby={idDescripcion}>
        {puntos.map((punto, indice) => {
          const alto = Math.max((punto.valor / mayor) * ALTO, punto.valor > 0 ? 2 : 0.5);
          return (
            <rect
              key={punto.etiquetaLarga ?? punto.etiqueta}
              x={indice * ancho + ancho * 0.12}
              y={ALTO - alto}
              width={ancho * 0.76}
              height={alto}
              rx={1.5}
              fill={color}
              opacity={indice === puntos.length - 1 ? 1 : 0.65}
            />
          );
        })}
      </svg>
      <p id={idDescripcion} className="sr-only">
        {descripcion}
      </p>
      {tabla ? (
        <TablaDatos
          titulo={titulo}
          columnas={['Periodo', nombreValor]}
          filas={puntos.map((punto) => ({ etiqueta: punto.etiquetaLarga ?? punto.etiqueta, valores: [punto.valor] }))}
        />
      ) : null}
    </div>
  );
}
