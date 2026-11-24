'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icono } from '@/components/ui/Icono';
import { ALTO_CIELO, ANCHO_CIELO } from '@/lib/constelaciones';
import { ALTO_LIENZO, ANCHO_LIENZO, columnaDeFecha, lineaCartela, type DatosCuadro } from '@/lib/reglas/cuadroMes';
import { nombreMes } from '@/lib/reglas/resumenMes';

const FORMATO_KG = new Intl.NumberFormat('es-CO');
// "12 de octubre": se lee bien en voz alta (el mes y el año ya están en la cartela).
const FORMATO_DIA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const formatearFecha = (fecha: string) => FORMATO_DIA.format(new Date(`${fecha}T00:00:00Z`));

// "Galería de meses" del Museo: cada mes es un cuadro, "El cielo de <mes>", generado con sus datos (SVG, sin
// imágenes). Frente: el lienzo y, debajo, la cartela. Al tocarlo se voltea y el reverso muestra las cifras.
// Se recorre de lado (scroll-snap) con flechas; con más de 12 meses, un filtro por año.
export function GaleriaCuadros({ cuadros, hoy }: { cuadros: DatosCuadro[]; hoy: string }) {
  const anios = useMemo(() => [...new Set(cuadros.map((cuadro) => cuadro.mes.slice(0, 4)))], [cuadros]);
  const [anio, setAnio] = useState<string>('todos');
  const lista = useRef<HTMLUListElement>(null);
  const [extremos, setExtremos] = useState({ inicio: true, fin: false });
  const idAnio = useId();

  const visibles = anio === 'todos' ? cuadros : cuadros.filter((cuadro) => cuadro.mes.startsWith(anio));
  const pasados = cuadros.filter((cuadro) => !cuadro.actual);

  const medir = () => {
    const elemento = lista.current;
    if (!elemento) return;
    setExtremos({
      inicio: elemento.scrollLeft <= 4,
      fin: elemento.scrollLeft + elemento.clientWidth >= elemento.scrollWidth - 4,
    });
  };
  useEffect(medir, [visibles.length]);

  const mover = (direccion: 1 | -1) => {
    const elemento = lista.current;
    if (!elemento) return;
    const paso = (elemento.querySelector('li')?.getBoundingClientRect().width ?? 260) + 16;
    const reducido = document.documentElement.dataset.movimiento === 'minimas';
    elemento.scrollBy({ left: direccion * paso, behavior: reducido ? 'auto' : 'smooth' });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {cuadros.length > 12 ? (
          <label htmlFor={idAnio} className="flex items-center gap-2 text-sm text-texto-suave">
            Año
            <select
              id={idAnio}
              value={anio}
              onChange={(evento) => setAnio(evento.target.value)}
              className="min-h-11 rounded-gym border border-borde-campo bg-campo px-3 text-base text-texto"
            >
              <option value="todos">Todos</option>
              {anios.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" onClick={() => mover(-1)} disabled={extremos.inicio} className={CLASES_FLECHA}>
            <Icono nombre="flechaIzquierda" className="h-4 w-4" />
            Anterior
          </button>
          <button type="button" onClick={() => mover(1)} disabled={extremos.fin} className={CLASES_FLECHA}>
            Siguiente
            <Icono nombre="flechaDerecha" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ul
        ref={lista}
        onScroll={medir}
        aria-label="Cuadros de tus meses"
        className="galeria-cuadros flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-2"
      >
        {visibles.map((cuadro) => (
          <li key={cuadro.mes} className="w-[260px] shrink-0 snap-start">
            <Cuadro cuadro={cuadro} hoy={hoy} />
          </li>
        ))}
        {pasados.length === 0 ? (
          <li className="w-[260px] shrink-0 snap-start">
            <div className="marco-vacio flex aspect-[4/5] items-center justify-center rounded-[14px] p-6 text-center text-base text-texto-suave">
              Tu primer cuadro se pinta cuando completes tu primer mes
            </div>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

const CLASES_FLECHA =
  'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-borde-fuerte px-4 text-sm font-medium text-texto hover:bg-primario-suave disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario';

function Cuadro({ cuadro, hoy }: { cuadro: DatosCuadro; hoy: string }) {
  const [volteado, setVolteado] = useState(false);
  const [globo, setGlobo] = useState<string | null>(null);
  const frente = useRef<HTMLButtonElement>(null);
  const reverso = useRef<HTMLButtonElement>(null);
  const primeraVez = useRef(true);
  const mes = nombreMes(cuadro.mes);
  const anio = cuadro.mes.slice(0, 4);
  const linea = lineaCartela(cuadro);
  const etiqueta = `El cielo de ${mes} de ${anio}: ${cuadro.titulo}. ${linea}${cuadro.actual ? '. En proceso' : ''}`;

  // Tras voltear, el foco pasa al botón de la cara visible (el de la otra cara deja de existir).
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    (volteado ? reverso : frente).current?.focus();
  }, [volteado]);

  return (
    <figure className="m-0">
      <div className="cuadro-marco" data-inclinar data-volteado={volteado ? '' : undefined}>
        <div className="cuadro-giro">
          {/* Frente: el lienzo. Las estrellas de los récords son botones encima del botón del cuadro. */}
          <div className="cuadro-cara cuadro-frente" inert={volteado || undefined}>
            <Lienzo cuadro={cuadro} hoy={hoy} />
            <button
              ref={frente}
              type="button"
              aria-pressed={false}
              aria-label={etiqueta}
              onClick={() => setVolteado(true)}
              className="absolute inset-0 z-10 rounded-[12px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
            />
            {cuadro.estrellas
              .filter((estrella) => estrella.records.length > 0)
              .map((estrella) => {
                const texto = `Récord del ${formatearFecha(estrella.fecha)}: ${estrella.records.map((r) => `${r.nombre}, ${r.marca}`).join('; ')}`;
                const abierto = globo === estrella.fecha;
                return (
                  <span
                    key={estrella.fecha}
                    className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${(estrella.x / ANCHO_LIENZO) * 100}%`, top: `${(estrella.y / ALTO_LIENZO) * 100}%` }}
                  >
                    <button
                      type="button"
                      aria-label={texto}
                      aria-expanded={abierto}
                      onClick={() => setGlobo(abierto ? null : estrella.fecha)}
                      className="block h-8 w-8 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
                    />
                    {abierto ? (
                      <span role="status" className="absolute left-1/2 top-full z-30 mt-1 w-48 -translate-x-1/2 rounded-boton border border-borde-fuerte bg-elevada p-2 text-sm text-texto shadow-elevada">
                        <span className="block font-semibold">{formatearFecha(estrella.fecha)}</span>
                        {estrella.records.map((record) => (
                          <span key={record.nombre} className="block text-texto-suave">
                            {record.nombre}: <span className="text-texto">{record.marca}</span>
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </span>
                );
              })}
          </div>

          {/* Reverso: las cifras del mes. */}
          <div className="cuadro-cara cuadro-reverso" inert={!volteado || undefined}>
            <div className="flex h-full flex-col gap-2 overflow-y-auto p-4 text-sm">
              <p className="font-marca text-base font-bold tracking-[0.08em] text-texto">
                <span className="capitalize">{mes}</span> {anio}
              </p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
                <dt className="text-texto-suave">Días</dt>
                <dd className="text-right font-semibold tabular-nums text-texto">{cuadro.dias}</dd>
                <dt className="text-texto-suave">Sesiones</dt>
                <dd className="text-right font-semibold tabular-nums text-texto">{cuadro.sesiones}</dd>
                <dt className="text-texto-suave">Volumen</dt>
                <dd className="text-right font-semibold tabular-nums text-texto">{FORMATO_KG.format(cuadro.volumenKg)} kg</dd>
                <dt className="text-texto-suave">Mejor racha</dt>
                <dd className="text-right font-semibold tabular-nums text-texto">{cuadro.mejorRacha}</dd>
              </dl>
              {cuadro.estrella ? (
                <p className="text-texto-suave">
                  Ejercicio estrella: <span className="font-semibold text-texto">{cuadro.estrella.nombre}</span> ({cuadro.estrella.sesiones}{' '}
                  {cuadro.estrella.sesiones === 1 ? 'sesión' : 'sesiones'})
                </p>
              ) : null}
              {cuadro.records.length > 0 ? (
                <ul className="space-y-0.5">
                  {cuadro.records.slice(0, 4).map((record) => (
                    <li key={`${record.fecha}-${record.nombre}`} className="flex justify-between gap-2">
                      <span className="truncate text-texto-suave">{record.nombre}</span>
                      <span className="shrink-0 font-semibold text-texto">{record.marca}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-texto-suave">Sin récords este mes.</p>
              )}
              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                {/* <a>: /gym/mi-mes se pide al servidor con su consulta (ver EnlaceLocal y el loading.tsx de /gym). */}
                <a href={`/gym/mi-mes?mes=${cuadro.mes}`} className={CLASES_ACCION_REVERSO}>
                  Ver la historia
                </a>
                <a href={`/gym/mi-mes?mes=${cuadro.mes}#compartir`} className={CLASES_ACCION_REVERSO}>
                  Compartir
                </a>
              </div>
              <button
                ref={reverso}
                type="button"
                aria-pressed
                aria-label={`Ver el cuadro. ${etiqueta}`}
                onClick={() => setVolteado(false)}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full text-sm font-medium text-texto-suave hover:text-texto focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
              >
                <Icono nombre="restaurar" className="h-4 w-4" />
                Ver el cuadro
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* La cartela, como en un museo. */}
      <figcaption className="mt-3 px-1">
        <p className="font-marca text-base font-bold tracking-[0.08em] text-texto">
          <span className="capitalize">{mes}</span> {anio}
        </p>
        <p className="font-semibold text-texto">{cuadro.titulo}</p>
        <p className="text-sm text-texto-suave">{cuadro.actual ? `Se completa el ${formatearFecha(cuadro.ultimoDia)}` : linea}</p>
      </figcaption>
    </figure>
  );
}

const CLASES_ACCION_REVERSO =
  'inline-flex min-h-11 items-center rounded-full bg-primario px-3.5 text-sm font-semibold text-white hover:bg-primario-fuerte focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario';

// "El cielo de <mes>": degradado propio del mes, constelaciones de las semanas completas, una estrella por día
// entrenado (tamaño según el volumen) y las de los récords en color acento con destello. En el mes en curso, el
// lienzo está "a medio pintar": lo que falta del mes queda velado.
function Lienzo({ cuadro, hoy }: { cuadro: DatosCuadro; hoy: string }) {
  const id = `lienzo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const columnas = columnaDeFecha(cuadro.ultimoDia, cuadro.mes) + 1;
  const pintado = cuadro.actual ? Math.min(1, (columnaDeFecha(hoy, cuadro.mes) + 1) / columnas) : 1;
  const xVelo = 10 + 80 * pintado;

  return (
    <svg aria-hidden="true" viewBox={`0 0 ${ANCHO_LIENZO} ${ALTO_LIENZO}`} className="lienzo-mes block h-full w-full" data-tono={cuadro.tono}>
      <defs>
        <linearGradient id={`${id}-fondo`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" className="lienzo-stop-a" />
          <stop offset="1" className="lienzo-stop-b" />
        </linearGradient>
      </defs>
      <rect width={ANCHO_LIENZO} height={ALTO_LIENZO} fill={`url(#${id}-fondo)`} />
      {cuadro.constelaciones.map((semana) => {
        const punto = ([px, py]: readonly [number, number]) => ({
          x: semana.x + (px - ANCHO_CIELO / 2) * semana.escala,
          y: semana.y + (py - ALTO_CIELO / 2) * semana.escala,
        });
        const estrellas = semana.constelacion.estrellas.map(punto);
        return (
          <g key={semana.lunes} className="lienzo-constelacion">
            {semana.constelacion.lineas.map(([a, b]) => (
              <line key={`${a}-${b}`} x1={estrellas[a]!.x} y1={estrellas[a]!.y} x2={estrellas[b]!.x} y2={estrellas[b]!.y} />
            ))}
            {estrellas.map((estrella, indice) => (
              <circle key={indice} cx={estrella.x} cy={estrella.y} r="0.9" />
            ))}
          </g>
        );
      })}
      {cuadro.estrellas.map((estrella) =>
        estrella.records.length > 0 ? (
          <g key={estrella.fecha} className="lienzo-record">
            <circle className="lienzo-destello" cx={estrella.x} cy={estrella.y} r={estrella.radio + 3} />
            <circle cx={estrella.x} cy={estrella.y} r={estrella.radio + 0.9} />
          </g>
        ) : (
          <circle key={estrella.fecha} className="lienzo-estrella" cx={estrella.x} cy={estrella.y} r={estrella.radio} />
        ),
      )}
      {cuadro.actual && pintado < 1 ? (
        <g className="lienzo-velo">
          <rect x={xVelo} y="0" width={ANCHO_LIENZO - xVelo} height={ALTO_LIENZO} />
          <line x1={xVelo} y1="8" x2={xVelo} y2={ALTO_LIENZO - 8} />
        </g>
      ) : null}
    </svg>
  );
}
