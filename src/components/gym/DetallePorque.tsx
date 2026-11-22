'use client';

import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useId, useState } from 'react';
import { Icono } from '@/components/ui/Icono';
import type { PorqueRecomendacion, Sesion } from '@/lib/dataService';
import { formatearFecha, formatearPeso } from '@/lib/formato';
import { CURVA_SALIDA, DURACION } from '@/lib/movimiento';
import { esEfectiva } from '@/lib/reglas/tecnicas';

const SESIONES_TABLA = 3;

function textoSeries(sesion: Sesion): string {
  const efectivas = sesion.series.filter(esEfectiva);
  const pesos = new Set(efectivas.map((serie) => serie.pesoGramos));
  const reps = efectivas.map((serie) => serie.reps).join(', ');
  if (pesos.size === 1 && efectivas[0]?.pesoGramos != null) return `${reps} con ${formatearPeso(efectivas[0].pesoGramos)}`;
  return efectivas.map((serie) => (serie.pesoGramos == null ? `${serie.reps}` : `${serie.reps} × ${formatearPeso(serie.pesoGramos)}`)).join(', ');
}

// "¿Por qué?" de la recomendación: se despliega (altura animada; sin animación con movimiento reducido) con las
// evidencias (✓ o ✗ con texto, no solo color), la regla aplicada, las últimas sesiones y qué pasa si no cambias.
export function DetallePorque({
  porque,
  sesiones = [],
}: {
  porque: PorqueRecomendacion;
  sesiones?: Sesion[] | undefined;
}) {
  const [abierto, setAbierto] = useState(false);
  const reducir = useReducedMotion() ?? false;
  const idPanel = useId();
  const ultimas = sesiones.slice(0, SESIONES_TABLA);

  return (
    <div className="mt-3" data-guia="detalle-porque">
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={() => setAbierto((valor) => !valor)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-boton px-2 text-sm font-semibold text-primario hover:bg-primario-suave focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario -ml-2"
      >
        <Icono nombre="pregunta" className="h-4 w-4" />
        ¿Por qué?
        <Icono nombre="chevronAbajo" className={`h-4 w-4 transition-transform motion-reduce:transition-none ${abierto ? 'rotate-180' : ''}`} />
      </button>
      <div id={idPanel}>
        <AnimatePresence initial={false}>
          {abierto ? (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reducir ? 0 : DURACION.base, ease: CURVA_SALIDA }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-4 rounded-boton bg-fondo p-3 text-sm">
                {porque.evidencias.length > 0 ? (
                  <section aria-label="Lo que se tuvo en cuenta">
                    <h3 className="font-semibold text-texto">Lo que se tuvo en cuenta</h3>
                    <ul className="mt-2 space-y-1.5">
                      {porque.evidencias.map((evidencia) => (
                        <li key={`${evidencia.etiqueta}-${evidencia.valor}`} className="flex items-start gap-2">
                          <span
                            className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                              evidencia.cumple ? 'bg-exito-suave text-exito' : 'bg-aviso-suave text-aviso'
                            }`}
                          >
                            <Icono nombre={evidencia.cumple ? 'check' : 'cerrar'} className="h-3.5 w-3.5" />
                          </span>
                          <span className="text-texto">
                            <span className="font-medium">{evidencia.etiqueta}:</span> {evidencia.valor}
                            <span className="sr-only">{evidencia.cumple ? ' (cumple)' : ' (no cumple)'}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                <section aria-label="La regla">
                  <h3 className="font-semibold text-texto">La regla</h3>
                  <p className="mt-1 text-texto">{porque.regla}</p>
                </section>
                {ultimas.length > 0 ? (
                  <section aria-label="Tus últimas sesiones">
                    <table className="w-full text-left">
                      <caption className="mb-1 text-left font-semibold text-texto">Tus últimas sesiones</caption>
                      <thead>
                        <tr className="text-texto-suave">
                          <th scope="col" className="py-1 pr-3 font-medium">
                            Fecha
                          </th>
                          <th scope="col" className="py-1 font-medium">
                            Repeticiones por serie
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ultimas.map((sesion) => (
                          <tr key={sesion.id} className="border-t border-borde">
                            <td className="py-1 pr-3 tabular-nums text-texto">{formatearFecha(sesion.fecha)}</td>
                            <td className="py-1 tabular-nums text-texto">{textoSeries(sesion)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                ) : null}
                {porque.siNoCambias ? (
                  <section aria-label="Si no cambias">
                    <h3 className="font-semibold text-texto">Si no cambias</h3>
                    <p className="mt-1 text-texto">{porque.siNoCambias}</p>
                  </section>
                ) : null}
              </div>
            </m.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
