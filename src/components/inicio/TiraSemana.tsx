'use client';

import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import type { Route } from 'next';
import Link from 'next/link';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { clasesBoton } from '@/components/ui/Boton';
import { CURVA_SALIDA, DURACION } from '@/lib/movimiento';
import type { DiaSemana } from '@/lib/reglas/inicio';

const ESTADO_TEXTO: Record<DiaSemana['estado'], string> = {
  entrenado: 'entrenado',
  planificado: 'planificado',
  descanso: 'descanso',
};

function etiquetaDia(dia: DiaSemana): string {
  const numero = Number(dia.fecha.slice(8));
  const estado =
    dia.estado === 'planificado' && !dia.esFuturo && !dia.esHoy
      ? 'planificado, sin entrenar'
      : ESTADO_TEXTO[dia.estado];
  return `${dia.nombre} ${numero}${dia.esHoy ? ', hoy' : ''}: ${estado}`;
}

// Tres estados que no dependen solo del color: relleno con check, contorno vacío y un punto.
function Pildora({ dia }: { dia: DiaSemana }) {
  const base =
    'flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold transition-colors';
  if (dia.estado === 'entrenado') {
    return (
      <span className={`${base} bg-primario text-white`}>
        <svg
          viewBox="0 0 16 16"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      </span>
    );
  }
  // La letra del día va debajo de la píldora: dentro solo queda la forma del estado.
  if (dia.estado === 'planificado') {
    return <span className={`${base} border-2 border-primario bg-superficie`} />;
  }
  return (
    <span className={`${base} bg-fondo`}>
      <span className="h-1.5 w-1.5 rounded-full bg-mantener" />
    </span>
  );
}

function ContenidoDia({ dia }: { dia: DiaSemana }) {
  if (dia.ejercicios.length > 0) {
    return (
      <>
        <p className="text-sm text-texto-suave">
          {dia.esHoy ? 'Hoy registraste:' : `El ${dia.nombre} registraste:`}
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {dia.ejercicios.map((ejercicio) => (
            <li key={ejercicio.id}>
              <Link
                href={`/gym/ejercicios/${ejercicio.id}` as Route}
                className="inline-flex min-h-11 items-center rounded-full border border-borde bg-superficie px-3 text-sm font-medium text-texto transition-colors hover:border-primario hover:text-primario focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
              >
                {ejercicio.nombre}
              </Link>
            </li>
          ))}
        </ul>
      </>
    );
  }
  if (dia.esHoy) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-texto">
          {dia.estado === 'descanso' ? 'Hoy es tu día de descanso.' : 'Aún no entrenas hoy.'}
        </p>
        <Link href="/gym/entrenamiento" className={clasesBoton()}>
          Entrenar hoy
        </Link>
      </div>
    );
  }
  const texto =
    dia.estado === 'descanso'
      ? 'Día de descanso.'
      : dia.esFuturo
        ? 'Día de entrenamiento planificado.'
        : 'Ese día no registraste ejercicios.';
  return <p className="text-sm text-texto">{texto}</p>;
}

// Tira de la semana: los 7 días como un grupo; con las flechas se cambia de día (un solo día en el orden de
// tabulación) y con Intro o Espacio se despliega lo que se hizo ese día.
export function TiraSemana({ dias }: { dias: DiaSemana[] }) {
  const reducir = useReducedMotion() ?? false;
  const idPanel = useId();
  const indiceHoy = Math.max(
    0,
    dias.findIndex((dia) => dia.esHoy),
  );
  const [enfocado, setEnfocado] = useState(indiceHoy);
  // Hoy empieza abierto: responde de entrada "¿qué hago hoy?".
  const [abierto, setAbierto] = useState<number | null>(indiceHoy);
  const botones = useRef<(HTMLButtonElement | null)[]>([]);

  const mover = (indice: number) => {
    const destino = (indice + dias.length) % dias.length;
    setEnfocado(destino);
    botones.current[destino]?.focus();
  };

  const alTeclear = (evento: KeyboardEvent<HTMLButtonElement>, indice: number) => {
    const acciones: Record<string, () => void> = {
      ArrowRight: () => mover(indice + 1),
      ArrowLeft: () => mover(indice - 1),
      Home: () => mover(0),
      End: () => mover(dias.length - 1),
    };
    const accion = acciones[evento.key];
    if (accion) {
      evento.preventDefault();
      accion();
    }
  };

  const diaAbierto = abierto === null ? null : dias[abierto];

  return (
    <div>
      <div role="group" aria-label="Días de esta semana" className="flex justify-between">
        {dias.map((dia, indice) => (
          <div key={dia.fecha} className="flex flex-col items-center gap-1">
            <button
              ref={(elemento) => {
                botones.current[indice] = elemento;
              }}
              type="button"
              tabIndex={indice === enfocado ? 0 : -1}
              aria-expanded={abierto === indice}
              aria-controls={idPanel}
              aria-label={etiquetaDia(dia)}
              onClick={() => {
                setEnfocado(indice);
                setAbierto(abierto === indice ? null : indice);
              }}
              onKeyDown={(evento) => alTeclear(evento, indice)}
              data-estado={dia.estado}
              className={`rounded-full transition-transform duration-150 ease-out hover:-translate-y-0.5 active:scale-95 motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario ${
                dia.esHoy ? 'ring-4 ring-primario-suave ring-offset-2 ring-offset-superficie' : ''
              } ${abierto === indice ? 'shadow-elevada' : ''}`}
            >
              <Pildora dia={dia} />
            </button>
            <span
              className={`text-xs ${dia.esHoy ? 'font-bold text-primario' : 'text-texto-suave'}`}
              aria-hidden="true"
            >
              {dia.esHoy ? 'Hoy' : dia.letra}
            </span>
          </div>
        ))}
      </div>

      <div id={idPanel} aria-live="polite">
        <AnimatePresence initial={false}>
          {diaAbierto ? (
            <m.div
              key={diaAbierto.fecha}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reducir ? 0 : DURACION.base, ease: CURVA_SALIDA }}
              className="overflow-hidden"
            >
              <div className="mt-3 rounded-boton bg-fondo p-3">
                <p className="mb-1 text-sm font-semibold capitalize text-texto">
                  {diaAbierto.nombre}
                </p>
                <ContenidoDia dia={diaAbierto} />
              </div>
            </m.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
