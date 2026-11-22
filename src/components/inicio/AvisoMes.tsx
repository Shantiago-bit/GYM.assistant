'use client';

import { useState } from 'react';
import { Cerrable } from '@/components/ui/Cerrable';
import { Icono } from '@/components/ui/Icono';
import { nombreMes } from '@/lib/reglas/resumenMes';

export const COOKIE_MES_CERRADO = 'gym-mes-cerrado';
const DURACION_COOKIE_SEGUNDOS = 40 * 24 * 60 * 60;

// "Tu mes de octubre está listo ✨": sale la primera semana del mes siguiente. Al cerrarlo se guarda el mes en una
// cookie (la lee el servidor, así que no vuelve a aparecer ni parpadea al recargar).
export function AvisoMes({ mes }: { mes: string }) {
  const [visible, setVisible] = useState(true);
  const cerrar = () => {
    setVisible(false);
    document.cookie = `${COOKIE_MES_CERRADO}=${mes}; path=/gym; max-age=${DURACION_COOKIE_SEGUNDOS}; samesite=lax`;
  };

  return (
    <Cerrable visible={visible}>
      <section
        aria-label={`Tu mes de ${nombreMes(mes)} está listo`}
        data-guia="aviso-mes"
        className="relative mb-5 flex flex-wrap items-center justify-between gap-3 rounded-tarjeta border border-primario bg-primario-suave p-4 pr-14"
      >
        <p className="font-semibold text-texto">
          Tu mes de {nombreMes(mes)} está listo <span aria-hidden="true">✨</span>
        </p>
        {/* <a>: /gym/mi-mes es otra página, pero se abre con una consulta; una carga normal es lo más simple. */}
        <a
          href={`/gym/mi-mes?mes=${mes}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-boton bg-primario px-4 text-sm font-semibold text-white hover:bg-primario-fuerte focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
        >
          Ver mi mes
          <Icono nombre="flechaDerecha" className="h-4 w-4" />
        </a>
        <button
          type="button"
          onClick={cerrar}
          aria-label={`Cerrar el aviso de tu mes de ${nombreMes(mes)}`}
          className="absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-texto-suave hover:bg-superficie hover:text-texto focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
        >
          <Icono nombre="cerrar" />
        </button>
      </section>
    </Cerrable>
  );
}
