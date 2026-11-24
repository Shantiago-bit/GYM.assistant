'use client';

import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { EnlaceLocal } from '@/components/ui/EnlaceLocal';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { Icono } from '@/components/ui/Icono';
import { ListaAnimada, SegmentoAnimado } from '@/components/ui/MovimientoLista';
import { FILTROS_EJERCICIOS, pasaFiltro, vistaEjercicios } from '@/lib/reglas/inicio';
import type { TipoEjercicio } from '@/lib/reglas/ejercicio';

export interface ElementoActivo {
  clave: string;
  tipo: TipoEjercicio;
  listo: boolean;
  contenido: ReactNode;
}

const ENLACE_DISCRETO =
  'inline-flex min-h-11 items-center rounded px-2 text-sm underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario';

// "Mis ejercicios": el servidor manda todas las tarjetas (activas y archivadas) y aquí se elige qué mostrar según
// la consulta de la URL. Los filtros cambian la URL con history.pushState (EnlaceLocal), así que funcionan con
// atrás y adelante y al recargar, sin volver a pedir la página.
export function ListaEjercicios({
  activos,
  archivados,
  botonNuevo,
}: {
  activos: ElementoActivo[];
  archivados: { clave: string; contenido: ReactNode }[];
  botonNuevo: ReactNode;
}) {
  const { archivados: verArchivados, filtro } = vistaEjercicios(useSearchParams().toString());

  if (verArchivados) {
    return (
      <>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="titulo-ejercicios" className="text-titulo-2 font-bold text-texto">
            Archivados
          </h2>
          <EnlaceLocal href="/gym#mis-ejercicios" className={`${ENLACE_DISCRETO} gap-1.5 font-semibold text-primario`}>
            <Icono nombre="flechaIzquierda" className="h-4 w-4" />
            Volver a mis ejercicios
          </EnlaceLocal>
        </div>
        {archivados.length === 0 ? (
          <EstadoVacio titulo="No hay ejercicios archivados" descripcion="Cuando archives uno, lo encontrarás aquí." />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {archivados.map((elemento) => (
              <li key={elemento.clave}>{elemento.contenido}</li>
            ))}
          </ul>
        )}
      </>
    );
  }

  const visibles = activos.filter((elemento) => pasaFiltro(elemento, filtro));
  return (
    <>
      <div className="velo-cielo mb-3 flex items-center justify-between gap-3 rounded-boton">
        <h2 id="titulo-ejercicios" className="text-titulo-2 font-bold text-texto">
          Mis ejercicios
        </h2>
        {botonNuevo}
      </div>
      <div className="mb-4" data-guia="filtros">
        <SegmentoAnimado
          etiqueta="Filtrar ejercicios"
          idIndicador="filtro-ejercicios"
          forma="chips"
          local
          opciones={FILTROS_EJERCICIOS.map((opcion) => ({
            href: opcion.href,
            texto: opcion.texto,
            activo: opcion.valor === filtro,
          }))}
        />
      </div>
      {visibles.length === 0 ? (
        <EstadoVacio
          titulo={filtro === 'listos' ? 'Ninguno está listo para subir todavía' : 'No hay ejercicios con este filtro'}
          descripcion="Prueba con otro filtro o crea un ejercicio nuevo."
        />
      ) : (
        <ListaAnimada className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3" guiaPrimero="tarjeta-ejercicio" elementos={visibles} />
      )}
      {archivados.length > 0 ? (
        <p className="mt-4 text-center">
          <EnlaceLocal href="/gym?archivados=1#mis-ejercicios" className={`${ENLACE_DISCRETO} text-texto-suave hover:text-texto`}>
            Ver archivados ({archivados.length})
          </EnlaceLocal>
        </p>
      ) : null}
    </>
  );
}
