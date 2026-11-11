'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ListaPrimerosPasos } from '@/components/gym/ListaPrimerosPasos';
import { Aviso } from '@/components/ui/Aviso';
import { Boton, clasesBoton } from '@/components/ui/Boton';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { registrarAccionGuia } from '@/lib/guia/acciones';
import { SECCIONES_GUIA, TEXTOS_GUIA, TEXTOS_PRIMEROS_PASOS, type SeccionGuia } from '@/lib/guia/contenido';
import type { PrimerosPasos } from '@/lib/reglas/guia';

function SeccionVista({ seccion, numero }: { seccion: SeccionGuia; numero: number }) {
  return (
    <>
      <h2 id={`titulo-${seccion.id}`} tabIndex={-1} className="text-xl font-bold text-texto outline-none">
        <span className="mr-2 text-primario">{numero}.</span>
        {seccion.titulo}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-texto-suave">
        {seccion.parrafos.map((parrafo) => (
          <p key={parrafo}>{parrafo}</p>
        ))}
      </div>
      {seccion.items ? (
        <dl className="mt-3 space-y-2 text-sm">
          {seccion.items.map((item) => (
            <div key={`${item.termino}-${item.texto}`} className="rounded-gym bg-fondo px-3 py-2">
              {item.termino ? <dt className="font-semibold text-texto">{item.termino}</dt> : null}
              <dd className="text-texto-suave">{item.texto}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {seccion.ejemplo ? (
        <div className="mt-4 rounded-gym border-l-4 border-primario bg-primario-suave px-4 py-3 text-sm">
          <p className="font-semibold text-texto">{seccion.ejemplo.titulo}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-texto">
            {seccion.ejemplo.lineas.map((linea) => (
              <li key={linea}>{linea}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {seccion.preguntas ? (
        <div className="mt-4">
          <p className="text-sm font-semibold text-texto">Ejemplos de preguntas</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {seccion.preguntas.map((pregunta) => (
              <li key={pregunta} className="rounded-full border border-borde bg-fondo px-3 py-1.5 text-sm text-texto">
                {pregunta}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {seccion.enlace ? (
        <Link href={seccion.enlace.href as Route} className={`${clasesBoton('secundario')} mt-4`}>
          {seccion.enlace.texto}
        </Link>
      ) : null}
    </>
  );
}

export function GuiaInteractiva({
  completadaInicial,
  pasosOcultosInicial,
  primerosPasos,
}: {
  completadaInicial: boolean;
  pasosOcultosInicial: boolean;
  primerosPasos: PrimerosPasos;
}) {
  const total = SECCIONES_GUIA.length;
  const [activa, setActiva] = useState(0);
  const [completada, setCompletada] = useState(completadaInicial);
  const [pasosOcultos, setPasosOcultos] = useState(pasosOcultosInicial);
  const [ocupada, setOcupada] = useState(false);
  const [error, setError] = useState('');
  const irAlTitulo = useRef(false);

  // Al cambiar de sección desde el índice o los botones, se lleva la vista y el foco a su título.
  useEffect(() => {
    if (!irAlTitulo.current) {
      return;
    }
    irAlTitulo.current = false;
    const titulo = document.getElementById(`titulo-${SECCIONES_GUIA[activa]?.id}`);
    titulo?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    titulo?.focus({ preventScroll: true });
  }, [activa]);

  const irA = (indice: number) => {
    irAlTitulo.current = true;
    setActiva(Math.min(Math.max(indice, 0), total - 1));
  };

  const ejecutar = async (accion: 'completar' | 'mostrar_pasos' | 'reiniciar') => {
    setOcupada(true);
    setError('');
    const ok = await registrarAccionGuia(accion);
    setOcupada(false);
    if (!ok) {
      setError('No se pudo guardar. Intenta de nuevo.');
      return;
    }
    if (accion === 'completar') setCompletada(true);
    if (accion === 'mostrar_pasos' || accion === 'reiniciar') setPasosOcultos(false);
    if (accion === 'reiniciar') setCompletada(false);
  };

  const ultima = activa === total - 1;

  return (
    <div className="grid gap-6 md:grid-cols-[14rem_1fr] lg:grid-cols-[16rem_1fr]">
      <nav aria-label={TEXTOS_GUIA.indice} className="md:sticky md:top-6 md:self-start">
        <details className="group rounded-gym border border-borde bg-superficie md:hidden">
          <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-texto">
            {TEXTOS_GUIA.indice} · {TEXTOS_GUIA.paso(activa + 1, total)}
          </summary>
          <IndiceSecciones activa={activa} irA={irA} />
        </details>
        <div className="hidden rounded-gym border border-borde bg-superficie md:block">
          <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-texto-suave">{TEXTOS_GUIA.indice}</p>
          <IndiceSecciones activa={activa} irA={irA} />
        </div>
      </nav>

      <div className="min-w-0 space-y-4">
        {SECCIONES_GUIA.map((seccion, indice) => (
          <section
            key={seccion.id}
            id={seccion.id}
            aria-labelledby={`titulo-${seccion.id}`}
            className={`scroll-mt-6 ${indice === activa ? '' : 'hidden md:block'}`}
          >
            <Tarjeta className="p-5">
              <SeccionVista seccion={seccion} numero={indice + 1} />
            </Tarjeta>
          </section>
        ))}

        <div className="flex items-center justify-between gap-2 md:hidden">
          <Boton variante="secundario" disabled={activa === 0} onClick={() => irA(activa - 1)}>
            ← {TEXTOS_GUIA.anterior}
          </Boton>
          <span className="text-xs text-texto-suave" aria-live="polite">
            {TEXTOS_GUIA.paso(activa + 1, total)}
          </span>
          <Boton variante="secundario" disabled={ultima} onClick={() => irA(activa + 1)}>
            {TEXTOS_GUIA.siguiente} →
          </Boton>
        </div>

        <section aria-labelledby="titulo-final" className={ultima ? '' : 'hidden md:block'}>
          <Tarjeta className="p-5">
            <h2 id="titulo-final" className="text-xl font-bold text-texto">
              {TEXTOS_PRIMEROS_PASOS.titulo}
            </h2>
            <div className="mt-3">
              <ListaPrimerosPasos primerosPasos={primerosPasos} />
            </div>
            {error ? (
              <div className="mt-3">
                <Aviso tipo="error">{error}</Aviso>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {completada ? (
                <p className="font-semibold text-emerald-700" role="status">
                  ✅ {TEXTOS_GUIA.completada}
                </p>
              ) : (
                <Boton disabled={ocupada} onClick={() => void ejecutar('completar')}>
                  {TEXTOS_GUIA.terminar}
                </Boton>
              )}
              {pasosOcultos && !primerosPasos.todosHechos ? (
                <Boton variante="secundario" disabled={ocupada} onClick={() => void ejecutar('mostrar_pasos')}>
                  {TEXTOS_GUIA.mostrarPasos}
                </Boton>
              ) : null}
              {completada ? (
                <Boton variante="fantasma" disabled={ocupada} onClick={() => void ejecutar('reiniciar')}>
                  {TEXTOS_GUIA.reiniciar}
                </Boton>
              ) : null}
            </div>
          </Tarjeta>
        </section>
      </div>
    </div>
  );
}

function IndiceSecciones({ activa, irA }: { activa: number; irA: (indice: number) => void }) {
  return (
    <ol className="space-y-0.5 p-2">
      {SECCIONES_GUIA.map((seccion, indice) => (
        <li key={seccion.id}>
          <a
            href={`#${seccion.id}`}
            aria-current={indice === activa ? 'step' : undefined}
            onClick={(evento) => {
              evento.preventDefault();
              irA(indice);
            }}
            className="block rounded-[7px] px-2 py-1.5 text-sm text-texto-suave transition hover:bg-primario-suave hover:text-texto focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario aria-[current=step]:bg-primario-suave aria-[current=step]:font-semibold aria-[current=step]:text-texto"
          >
            {indice + 1}. {seccion.titulo}
          </a>
        </li>
      ))}
    </ol>
  );
}
