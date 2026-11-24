'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icono } from '@/components/ui/Icono';
import { listaDias, TEXTO_HOY, textoRacha, type ContextoChat } from '@/lib/chat/contextoVisible';

const PREGUNTA_HOY: Record<ContextoChat['estadoHoy'], string> = {
  entrenar: '¿Qué entreno hoy?',
  descanso: '¿Qué hago en mi día de descanso?',
  entrenado: '¿Cómo me fue en el entrenamiento de hoy?',
};

const CLASES_DATO =
  'flex w-full min-h-11 flex-col items-start rounded-gym px-3 py-2 text-left transition-colors hover:bg-primario-suave focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario';

function Dato({ etiqueta, valor, pregunta, alPreguntar }: { etiqueta: string; valor: ReactNode; pregunta: string; alPreguntar: (texto: string) => void }) {
  return (
    <li>
      <button type="button" className={CLASES_DATO} onClick={() => alPreguntar(pregunta)} title={`Escribir: ${pregunta}`}>
        <span className="text-sm text-texto-suave">{etiqueta}</span>
        <span className="text-base font-medium text-texto">{valor}</span>
      </button>
    </li>
  );
}

// "Lo que sé de ti": los mismos datos que CHRONO usa como contexto, en lenguaje claro. Cada dato escribe una
// pregunta relacionada en el campo (no la envía).
export function PanelContexto({ contexto, alPreguntar }: { contexto: ContextoChat; alPreguntar: (texto: string) => void }) {
  const idEjercicios = useId();
  return (
    <div className="flex flex-col gap-4 p-4">
      <ul className="flex flex-col gap-0.5">
        {contexto.apodo ? <Dato etiqueta="Te llamo" valor={contexto.apodo} pregunta="¿Qué sabes de mí?" alPreguntar={alPreguntar} /> : null}
        <Dato
          etiqueta="Tus días de entrenamiento"
          valor={listaDias(contexto.dias)}
          pregunta="¿Cómo organizo mis ejercicios en mis días de entrenamiento?"
          alPreguntar={alPreguntar}
        />
        <Dato etiqueta="Hoy" valor={TEXTO_HOY[contexto.estadoHoy]} pregunta={PREGUNTA_HOY[contexto.estadoHoy]} alPreguntar={alPreguntar} />
        <Dato etiqueta="Racha actual" valor={textoRacha(contexto.racha)} pregunta="¿Cómo mantengo mi racha?" alPreguntar={alPreguntar} />
        {contexto.constelacion ? (
          <Dato
            etiqueta="Constelación de la semana"
            valor={`${contexto.constelacion.nombre} · ${contexto.constelacion.encendidas} de ${contexto.constelacion.total}`}
            pregunta="¿Cuántos días me faltan para completar esta semana?"
            alPreguntar={alPreguntar}
          />
        ) : null}
        {contexto.record ? (
          <Dato
            etiqueta="Último récord"
            valor={`${contexto.record.nombre}: ${contexto.record.marca}`}
            pregunta={`Cuéntame de mi récord en ${contexto.record.nombre}`}
            alPreguntar={alPreguntar}
          />
        ) : null}
      </ul>

      <div>
        <h3 id={idEjercicios} className="px-3 text-sm font-semibold uppercase tracking-wide text-primario">
          Tus ejercicios
        </h3>
        {contexto.ejercicios.length === 0 ? (
          <p className="px-3 pt-1 text-sm text-texto-suave">Aún no tienes ejercicios activos.</p>
        ) : (
          <ul className="mt-1 flex flex-col gap-0.5">
            {contexto.ejercicios.map((ejercicio) => (
              <li key={ejercicio.id}>
                <button
                  type="button"
                  className={CLASES_DATO}
                  onClick={() => alPreguntar(`¿Cómo voy en ${ejercicio.nombre}?`)}
                  title={`Escribir: ¿Cómo voy en ${ejercicio.nombre}?`}
                >
                  <span className="text-base font-medium text-texto">{ejercicio.nombre}</span>
                  <span className="text-sm text-texto-suave">{ejercicio.frase}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="border-t border-borde px-3 pt-3 text-sm text-texto-suave">
        CHRONO solo ve estos datos de tu cuenta. Tus mensajes no se guardan en el servidor.
      </p>
    </div>
  );
}

const ENFOCABLES = 'a[href], button:not([disabled]), textarea, input, [tabindex]:not([tabindex="-1"])';

// En pantallas angostas el panel se abre como hoja (abajo en móvil, a la derecha desde 768 px): diálogo modal con
// el foco atrapado, Esc para cerrar y el foco de vuelta al botón que la abrió.
export function HojaContexto({ abierta, alCerrar, children }: { abierta: boolean; alCerrar: () => void; children: ReactNode }) {
  const idTitulo = useId();
  const panel = useRef<HTMLDivElement>(null);
  const cerrar = useRef(alCerrar);
  cerrar.current = alCerrar;

  useEffect(() => {
    if (!abierta) return undefined;
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.querySelector<HTMLElement>(ENFOCABLES)?.focus();
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        cerrar.current();
        return;
      }
      if (evento.key !== 'Tab' || !panel.current) return;
      const enfocables = Array.from(panel.current.querySelectorAll<HTMLElement>(ENFOCABLES));
      const primero = enfocables[0];
      const ultimo = enfocables.at(-1);
      if (!primero || !ultimo) return;
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && (document.activeElement === ultimo || !panel.current.contains(document.activeElement))) {
        evento.preventDefault();
        primero.focus();
      }
    };
    window.addEventListener('keydown', alPulsar);
    return () => {
      window.removeEventListener('keydown', alPulsar);
      if (anterior?.isConnected) anterior.focus();
    };
  }, [abierta]);

  if (!abierta) return null;
  return createPortal(
    <div className="anim-fundido fixed inset-0 z-50 flex items-end bg-black/50 md:items-stretch md:justify-end" onClick={alCerrar}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onClick={(evento) => evento.stopPropagation()}
        className="hoja-contexto flex max-h-[85dvh] w-full flex-col overflow-y-auto rounded-t-3xl border-t border-borde-fuerte bg-elevada pb-[env(safe-area-inset-bottom)] md:max-h-none md:w-96 md:rounded-none md:border-l md:border-t-0"
      >
        <div className="flex items-center justify-between gap-3 border-b border-borde px-4 py-3">
          <h2 id={idTitulo} className="text-lg font-semibold text-texto">
            Lo que sé de ti
          </h2>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="flex h-11 w-11 items-center justify-center rounded-full text-texto hover:bg-primario-suave focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
          >
            <Icono nombre="cerrar" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
