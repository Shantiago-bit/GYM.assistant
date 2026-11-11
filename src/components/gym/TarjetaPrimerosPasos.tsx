'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BarraAvance } from '@/components/ui/BarraAvance';
import { Boton } from '@/components/ui/Boton';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { registrarAccionGuia } from '@/lib/guia/acciones';
import { TEXTOS_PRIMEROS_PASOS } from '@/lib/guia/contenido';
import type { PrimerosPasos } from '@/lib/reglas/guia';

export function TarjetaPrimerosPasos({ primerosPasos }: { primerosPasos: PrimerosPasos }) {
  const [visible, setVisible] = useState(true);
  const { todosHechos, siguiente, completados, total, porcentaje } = primerosPasos;

  // Con todo completo se felicita una sola vez: se oculta para las próximas visitas.
  useEffect(() => {
    if (todosHechos) {
      void registrarAccionGuia('ocultar_pasos');
    }
  }, [todosHechos]);

  const ocultar = () => {
    setVisible(false);
    void registrarAccionGuia('ocultar_pasos');
  };

  if (!visible) {
    return null;
  }

  return (
    <Tarjeta className="mb-5" aria-labelledby="titulo-primeros-pasos" role="region">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="titulo-primeros-pasos" className="font-semibold text-texto">
            {TEXTOS_PRIMEROS_PASOS.titulo}
          </h2>
          <p className="text-sm text-texto-suave">{TEXTOS_PRIMEROS_PASOS.completados(completados, total)}</p>
        </div>
        {!todosHechos ? (
          <Boton variante="fantasma" onClick={ocultar} aria-label="Ocultar los primeros pasos">
            {TEXTOS_PRIMEROS_PASOS.ocultar}
          </Boton>
        ) : null}
      </div>

      <div className="mt-3">
        <BarraAvance porcentaje={porcentaje} etiqueta={TEXTOS_PRIMEROS_PASOS.titulo} />
      </div>

      {todosHechos ? (
        <div className="mt-3 text-sm" role="status">
          <p className="font-semibold text-emerald-700">{TEXTOS_PRIMEROS_PASOS.felicitacion}</p>
          <p className="text-texto-suave">{TEXTOS_PRIMEROS_PASOS.felicitacionDetalle}</p>
        </div>
      ) : siguiente ? (
        <p className="mt-3 text-sm text-texto-suave">
          <span className="font-medium text-texto">{TEXTOS_PRIMEROS_PASOS.siguiente}: </span>
          <Link href={siguiente.href as Route} className="font-semibold text-primario underline-offset-2 hover:underline">
            {siguiente.titulo}
          </Link>
          <span className="block">{siguiente.descripcion}</span>
        </p>
      ) : null}
    </Tarjeta>
  );
}
