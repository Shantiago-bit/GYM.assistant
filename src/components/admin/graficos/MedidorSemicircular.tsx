'use client';

import { useId } from 'react';
import { formatoNumero } from './escala';
import { TablaDatos } from './TablaDatos';

const RADIO = 80;
const GROSOR = 16;
const LARGO_ARCO = Math.PI * RADIO;

// Medidor semicircular: cuánto del total lleva un valor (por ejemplo, personas activas frente a la meta del
// mes). La cifra va en HTML, centrada bajo el arco.
export function MedidorSemicircular({
  titulo,
  valor,
  total,
  etiquetaValor,
  etiquetaTotal,
  color = 'var(--color-primario)',
}: {
  titulo: string;
  valor: number;
  total: number;
  etiquetaValor: string;
  etiquetaTotal: string;
  color?: string;
}) {
  const idTitulo = useId();
  const fraccion = total > 0 ? Math.min(1, Math.max(0, valor / total)) : 0;
  const porcentaje = Math.round(fraccion * 100);
  const descripcion = `${formatoNumero(valor)} de ${formatoNumero(total)} (${porcentaje} %)`;

  return (
    <figure className="m-0" aria-labelledby={idTitulo}>
      <figcaption id={idTitulo} className="sr-only">
        {titulo}: {descripcion}
      </figcaption>
      <div className="relative mx-auto w-full max-w-64">
        <svg viewBox={`0 0 ${RADIO * 2 + GROSOR} ${RADIO + GROSOR}`} className="block w-full" role="img" aria-labelledby={idTitulo}>
          <path
            d={`M ${GROSOR / 2} ${RADIO + GROSOR / 2} A ${RADIO} ${RADIO} 0 0 1 ${RADIO * 2 + GROSOR / 2} ${RADIO + GROSOR / 2}`}
            fill="none"
            stroke="var(--color-borde)"
            strokeWidth={GROSOR}
            strokeLinecap="round"
          />
          <path
            d={`M ${GROSOR / 2} ${RADIO + GROSOR / 2} A ${RADIO} ${RADIO} 0 0 1 ${RADIO * 2 + GROSOR / 2} ${RADIO + GROSOR / 2}`}
            fill="none"
            stroke={color}
            strokeWidth={GROSOR}
            strokeLinecap="round"
            strokeDasharray={`${fraccion * LARGO_ARCO} ${LARGO_ARCO}`}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center" aria-hidden="true">
          <p className="text-3xl font-black tabular-nums text-texto">{porcentaje} %</p>
          <p className="text-sm text-texto-suave">{descripcion}</p>
        </div>
      </div>
      <TablaDatos titulo={titulo} columnas={['Dato', 'Valor']} filas={[{ etiqueta: etiquetaValor, valores: [valor] }, { etiqueta: etiquetaTotal, valores: [total] }]} />
    </figure>
  );
}
