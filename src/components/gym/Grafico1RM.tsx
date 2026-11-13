'use client';

import { useId, useState, type PointerEvent } from 'react';
import { formatearFecha, formatearPeso } from '@/lib/formato';
import type { Punto1RM } from '@/lib/reglas/fuerza';

const ANCHO = 640;
const ALTO = 220;
const MARGEN = { arriba: 16, derecha: 64, abajo: 28, izquierda: 48 };
const PASOS_KG = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100];

// Marcas del eje en kilos redondos: unas cuatro divisiones que contienen todos los puntos.
function escalaY(valoresKg: number[]): { min: number; max: number; marcas: number[] } {
  const menor = Math.min(...valoresKg);
  const mayor = Math.max(...valoresKg);
  const amplitud = Math.max(mayor - menor, 1);
  const paso = PASOS_KG.find((candidato) => amplitud / candidato <= 4) ?? 100;
  const min = Math.floor(menor / paso) * paso;
  const max = Math.max(Math.ceil(mayor / paso) * paso, min + paso);
  const marcas: number[] = [];
  for (let valor = min; valor <= max + paso / 2; valor += paso) marcas.push(Number(valor.toFixed(2)));
  return { min, max, marcas };
}

export function Grafico1RM({ puntos, titulo = '1RM estimado' }: { puntos: Punto1RM[]; titulo?: string }) {
  const idTitulo = useId();
  const [activo, setActivo] = useState<number | null>(null);

  const valoresKg = puntos.map((punto) => punto.gramos / 1000);
  const { min, max, marcas } = escalaY(valoresKg);
  const anchoUtil = ANCHO - MARGEN.izquierda - MARGEN.derecha;
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
  const x = (indice: number) =>
    MARGEN.izquierda + (puntos.length === 1 ? anchoUtil / 2 : (indice / (puntos.length - 1)) * anchoUtil);
  const y = (kg: number) => MARGEN.arriba + altoUtil - ((kg - min) / (max - min)) * altoUtil;

  const trazo = valoresKg.map((kg, indice) => `${indice === 0 ? 'M' : 'L'}${x(indice)},${y(kg)}`).join(' ');
  const ultimo = puntos.length - 1;

  // El cursor se ajusta al punto más cercano en X: no hace falta apuntar a la línea.
  const alMover = (evento: PointerEvent<SVGRectElement>) => {
    const caja = evento.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!caja) return;
    const posicion = ((evento.clientX - caja.left) / caja.width) * ANCHO;
    let cercano = 0;
    puntos.forEach((_, indice) => {
      if (Math.abs(x(indice) - posicion) < Math.abs(x(cercano) - posicion)) cercano = indice;
    });
    setActivo(cercano);
  };

  const puntoActivo = activo === null ? null : puntos[activo];

  return (
    <figure aria-labelledby={idTitulo} className="m-0">
      <figcaption id={idTitulo} className="sr-only">
        {titulo} por sesión
      </figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="block h-auto w-full" role="img" aria-labelledby={idTitulo}>
          {marcas.map((marca) => (
            <g key={marca}>
              <line
                x1={MARGEN.izquierda}
                x2={ANCHO - MARGEN.derecha}
                y1={y(marca)}
                y2={y(marca)}
                stroke="var(--color-borde)"
                strokeWidth={1}
              />
              <text
                x={MARGEN.izquierda - 8}
                y={y(marca)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={12}
                fill="var(--color-texto-suave)"
              >
                {marca.toLocaleString('es-CO')}
              </text>
            </g>
          ))}

          <text x={MARGEN.izquierda} y={ALTO - 6} fontSize={12} fill="var(--color-texto-suave)">
            {formatearFecha(puntos[0]!.fecha)}
          </text>
          {ultimo > 0 ? (
            <text x={x(ultimo)} y={ALTO - 6} textAnchor="end" fontSize={12} fill="var(--color-texto-suave)">
              {formatearFecha(puntos[ultimo]!.fecha)}
            </text>
          ) : null}

          {puntoActivo && activo !== null ? (
            <line
              x1={x(activo)}
              x2={x(activo)}
              y1={MARGEN.arriba}
              y2={MARGEN.arriba + altoUtil}
              stroke="var(--color-texto-suave)"
              strokeWidth={1}
            />
          ) : null}

          <path
            d={trazo}
            fill="none"
            stroke="var(--color-primario)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {valoresKg.map((kg, indice) => (
            <circle
              key={indice}
              cx={x(indice)}
              cy={y(kg)}
              r={indice === activo ? 6 : 4}
              fill="var(--color-primario)"
              stroke="var(--color-superficie)"
              strokeWidth={2}
            />
          ))}

          <text
            x={x(ultimo) + 10}
            y={y(valoresKg[ultimo]!)}
            dominantBaseline="middle"
            fontSize={13}
            fontWeight={600}
            fill="var(--color-texto)"
          >
            {formatearPeso(puntos[ultimo]!.gramos)}
          </text>

          <rect
            x={MARGEN.izquierda - 12}
            y={0}
            width={anchoUtil + 24}
            height={ALTO}
            fill="transparent"
            onPointerMove={alMover}
            onPointerLeave={() => setActivo(null)}
          />
        </svg>

        {puntoActivo && activo !== null ? (
          <div
            role="status"
            className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-gym border border-borde bg-superficie px-2.5 py-1.5 text-sm shadow-md"
            style={{ left: `${Math.min(Math.max((x(activo) / ANCHO) * 100, 12), 88)}%` }}
          >
            <strong className="block text-sm tabular-nums text-texto">{formatearPeso(puntoActivo.gramos)}</strong>
            <span className="text-texto-suave">{formatearFecha(puntoActivo.fecha)}</span>
          </div>
        ) : null}
      </div>

      <details className="mt-2 text-sm">
        <summary className="cursor-pointer font-medium text-primario">Ver como tabla</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead>
            <tr className="text-sm text-texto-suave">
              <th className="py-1 font-medium">Fecha</th>
              <th className="py-1 text-right font-medium">{titulo}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borde">
            {puntos.map((punto, indice) => (
              <tr key={`${punto.fecha}-${indice}`}>
                <td className="py-1 text-texto-suave">{formatearFecha(punto.fecha)}</td>
                <td className="py-1 text-right font-medium text-texto">{formatearPeso(punto.gramos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
