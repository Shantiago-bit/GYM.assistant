'use client';

import { useState } from 'react';
import { etiquetaMes, PERIODOS_RESUMEN, type FilaMensual, type MetricaResumen, type PeriodoResumen } from '@/lib/reglas/admin';
import { GraficoArea } from './graficos/GraficoArea';

const METRICAS: { valor: MetricaResumen; texto: string }[] = [
  { valor: 'registros', texto: 'Registros' },
  { valor: 'activas', texto: 'Personas activas' },
  { valor: 'sesiones', texto: 'Sesiones' },
];

const NOMBRE_PERIODO: Record<PeriodoResumen, string> = { 3: '3 M', 6: '6 M', 12: '12 M' };

// Grupo de botones con aria-pressed: se recorren con Tab y se eligen con Enter o Espacio.
function Selector<T extends string | number>({
  etiqueta,
  opciones,
  valor,
  alCambiar,
}: {
  etiqueta: string;
  opciones: { valor: T; texto: string; textoLector?: string }[];
  valor: T;
  alCambiar: (valor: T) => void;
}) {
  return (
    <div role="group" aria-label={etiqueta} className="inline-flex flex-wrap gap-1 rounded-full bg-[color:var(--admin-igual-fondo)] p-1">
      {opciones.map((opcion) => (
        <button
          key={String(opcion.valor)}
          type="button"
          aria-pressed={opcion.valor === valor}
          onClick={() => alCambiar(opcion.valor)}
          className={`min-h-11 rounded-full px-3 text-sm font-semibold transition ${
            opcion.valor === valor ? 'bg-primario text-white' : 'text-[color:var(--admin-igual-texto)] hover:bg-white'
          }`}
        >
          {opcion.texto}
          {opcion.textoLector ? <span className="sr-only"> ({opcion.textoLector})</span> : null}
        </button>
      ))}
    </div>
  );
}

// Tarjeta principal del resumen: métrica y periodo elegibles, y los 4 mini indicadores del periodo.
export function PanelTendencia({
  meses,
  totalCuentas,
  activasPeriodo,
}: {
  meses: FilaMensual[]; // 12 meses completos, del más viejo al actual
  totalCuentas: number;
  activasPeriodo: Record<PeriodoResumen, number>;
}) {
  const [metrica, setMetrica] = useState<MetricaResumen>('activas');
  const [periodo, setPeriodo] = useState<PeriodoResumen>(6);
  const visibles = meses.slice(-periodo);
  const nombreMetrica = METRICAS.find((opcion) => opcion.valor === metrica)!.texto;
  const suma = (campo: 'sesiones' | 'series') => visibles.reduce((total, fila) => total + fila[campo], 0);

  const mini = [
    { titulo: 'Total de cuentas', valor: totalCuentas },
    { titulo: 'Personas activas', valor: activasPeriodo[periodo] },
    { titulo: 'Sesiones registradas', valor: suma('sesiones') },
    { titulo: 'Series registradas', valor: suma('series') },
  ];

  return (
    <section aria-labelledby="titulo-tendencia" className="vidrio p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-tendencia" className="text-lg font-bold text-texto">
          {nombreMetrica} por mes
        </h2>
        <div className="flex flex-wrap gap-2">
          <Selector etiqueta="Métrica" opciones={METRICAS} valor={metrica} alCambiar={setMetrica} />
          <Selector
            etiqueta="Periodo"
            opciones={PERIODOS_RESUMEN.map((meses) => ({ valor: meses, texto: NOMBRE_PERIODO[meses], textoLector: `${meses} meses` }))}
            valor={periodo}
            alCambiar={setPeriodo}
          />
        </div>
      </div>
      <div className="mt-4">
        <GraficoArea
          titulo={`${nombreMetrica} por mes, últimos ${periodo} meses`}
          descripcion={`Gráfico de área con una línea punteada del promedio. De ${etiquetaMes(visibles[0]!.mes, true)} a ${etiquetaMes(visibles.at(-1)!.mes, true)}.`}
          nombreValor={nombreMetrica}
          puntos={visibles.map((fila) => ({ etiqueta: etiquetaMes(fila.mes), etiquetaLarga: etiquetaMes(fila.mes, true), valor: fila[metrica] }))}
        />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {mini.map((indicador) => (
          <div key={indicador.titulo} className="rounded-2xl bg-[color:var(--color-fondo)] p-3">
            <dt className="text-sm text-texto-suave">
              {indicador.titulo}
              <span className="sr-only"> (últimos {periodo} meses{indicador.titulo === 'Total de cuentas' ? ', total histórico' : ''})</span>
            </dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-texto">{indicador.valor.toLocaleString('es-CO')}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
