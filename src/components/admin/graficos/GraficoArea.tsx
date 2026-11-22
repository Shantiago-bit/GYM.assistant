'use client';

import { useId } from 'react';
import { formatoNumero, topeRedondo } from './escala';
import { TablaDatos } from './TablaDatos';

export interface PuntoGrafico {
  etiqueta: string; // la del eje (por ejemplo "nov")
  etiquetaLarga?: string; // la de la tabla y el lector de pantalla (por ejemplo "nov 2026")
  valor: number;
}

const ANCHO = 640;
const ALTO = 220;
const MARGEN_ARRIBA = 12;
const MARGEN_ABAJO = 4;

// Gráfico de área con línea punteada del promedio. El SVG solo dibuja; las cifras y las etiquetas van en HTML
// (no se encogen por debajo de 14 px en pantallas angostas) y en la tabla alternativa.
export function GraficoArea({
  titulo,
  descripcion,
  puntos,
  nombreValor,
  mostrarPromedio = true,
}: {
  titulo: string;
  descripcion: string;
  puntos: PuntoGrafico[];
  nombreValor: string;
  mostrarPromedio?: boolean;
}) {
  const idTitulo = useId();
  const idDescripcion = useId();
  const valores = puntos.map((punto) => punto.valor);
  const tope = topeRedondo(Math.max(0, ...valores));
  const promedio = valores.length ? valores.reduce((suma, valor) => suma + valor, 0) / valores.length : 0;

  const x = (indice: number) => (puntos.length <= 1 ? ANCHO / 2 : (indice / (puntos.length - 1)) * ANCHO);
  const y = (valor: number) => MARGEN_ARRIBA + (1 - valor / tope) * (ALTO - MARGEN_ARRIBA - MARGEN_ABAJO);
  const linea = puntos.map((punto, indice) => `${indice === 0 ? 'M' : 'L'}${x(indice)},${y(punto.valor)}`).join(' ');
  const area = puntos.length ? `${linea} L${x(puntos.length - 1)},${ALTO} L${x(0)},${ALTO} Z` : '';
  const idDegradado = `${idTitulo}-degradado`.replace(/:/g, '');
  // Con muchos meses, el eje muestra uno de cada dos (la tabla tiene todos).
  const saltar = puntos.length > 6 ? 2 : 1;

  return (
    <figure className="m-0" aria-labelledby={idTitulo} aria-describedby={idDescripcion}>
      <figcaption id={idTitulo} className="sr-only">
        {titulo}
      </figcaption>
      <p id={idDescripcion} className="sr-only">
        {descripcion}
      </p>
      <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm text-texto-suave">
        <span>Máximo del eje: {formatoNumero(tope)}</span>
        {mostrarPromedio ? (
          <span className="inline-flex items-center gap-2">
            <svg aria-hidden="true" width="24" height="4" className="shrink-0">
              <line x1="0" x2="24" y1="2" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
            </svg>
            Promedio: {formatoNumero(promedio)}
          </span>
        ) : null}
      </div>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="none" className="block h-48 w-full sm:h-56" role="img" aria-labelledby={idTitulo} aria-describedby={idDescripcion}>
        <defs>
          <linearGradient id={idDegradado} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primario)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-primario)" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((fraccion) => (
          <line key={fraccion} x1={0} x2={ANCHO} y1={y(tope * fraccion)} y2={y(tope * fraccion)} stroke="var(--color-borde)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        {area ? <path d={area} fill={`url(#${idDegradado})`} /> : null}
        {linea ? (
          <path d={linea} fill="none" stroke="var(--color-primario)" strokeWidth={3} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ) : null}
        {mostrarPromedio && puntos.length ? (
          <line x1={0} x2={ANCHO} y1={y(promedio)} y2={y(promedio)} stroke="var(--color-texto-suave)" strokeWidth={2} strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
        ) : null}
      </svg>
      <ol className="mt-2 grid text-sm text-texto-suave" style={{ gridTemplateColumns: `repeat(${Math.max(puntos.length, 1)}, minmax(0, 1fr))` }} aria-hidden="true">
        {puntos.map((punto, indice) => (
          <li key={punto.etiquetaLarga ?? punto.etiqueta} className="text-center">
            {indice % saltar === (puntos.length - 1) % saltar ? punto.etiqueta : ''}
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
