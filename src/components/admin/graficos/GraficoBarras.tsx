'use client';

import { useId } from 'react';
import type { PuntoGrafico } from './GraficoArea';
import { formatoNumero, topeRedondo } from './escala';
import { TablaDatos } from './TablaDatos';

const ANCHO = 640;
const ALTO = 200;

// Barras verticales (por ejemplo, sesiones por día). Las etiquetas van en HTML y los datos, en la tabla.
export function GraficoBarras({
  titulo,
  descripcion,
  puntos,
  nombreValor,
  color = 'var(--color-primario)',
}: {
  titulo: string;
  descripcion: string;
  puntos: PuntoGrafico[];
  nombreValor: string;
  color?: string;
}) {
  const idTitulo = useId();
  const idDescripcion = useId();
  const tope = topeRedondo(Math.max(0, ...puntos.map((punto) => punto.valor)));
  const ancho = ANCHO / Math.max(puntos.length, 1);
  const saltar = Math.ceil(puntos.length / 8);

  return (
    <figure className="m-0" aria-labelledby={idTitulo} aria-describedby={idDescripcion}>
      <figcaption id={idTitulo} className="sr-only">
        {titulo}
      </figcaption>
      <p id={idDescripcion} className="sr-only">
        {descripcion}
      </p>
      <p className="mb-2 text-sm text-texto-suave">Máximo del eje: {formatoNumero(tope)}</p>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="none" className="block h-44 w-full" role="img" aria-labelledby={idTitulo} aria-describedby={idDescripcion}>
        <line x1={0} x2={ANCHO} y1={ALTO - 0.5} y2={ALTO - 0.5} stroke="var(--color-borde)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {puntos.map((punto, indice) => {
          const alto = (punto.valor / tope) * (ALTO - 4);
          return <rect key={punto.etiquetaLarga ?? punto.etiqueta} x={indice * ancho + ancho * 0.15} y={ALTO - alto} width={ancho * 0.7} height={alto} rx={3} fill={color} />;
        })}
      </svg>
      <ol className="mt-2 grid text-sm text-texto-suave" style={{ gridTemplateColumns: `repeat(${Math.max(puntos.length, 1)}, minmax(0, 1fr))` }} aria-hidden="true">
        {puntos.map((punto, indice) => (
          <li key={punto.etiquetaLarga ?? punto.etiqueta} className="overflow-visible whitespace-nowrap text-center">
            {indice % saltar === 0 ? punto.etiqueta : ''}
          </li>
        ))}
      </ol>
      <TablaDatos
        titulo={titulo}
        columnas={['Periodo', nombreValor]}
        filas={puntos.map((punto) => ({ etiqueta: punto.etiquetaLarga ?? punto.etiqueta, valores: [punto.valor] }))}
      />
    </figure>
  );
}
