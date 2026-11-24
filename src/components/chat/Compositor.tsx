'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from 'react';
import { reconocimientoDeVoz, type Reconocimiento } from '@/components/gym/EscribeloRapido';
import { Icono } from '@/components/ui/Icono';
import { SEGUIMIENTOS } from '@/lib/chat/sugerencias';

const MAX_LINEAS = 6;
const AVISO_CARACTERES = 200; // el contador aparece cuando faltan menos de 200

// El compositor del chat: un campo que crece hasta 6 líneas, enviar/detener en un solo botón circular, dictado
// por voz (si el navegador lo tiene), chips de seguimiento y el aviso de salud. Enter envía, Shift+Enter hace
// salto de línea y Esc detiene la respuesta en curso (respetando la composición de acentos).
export function Compositor({
  valor,
  alCambiar,
  alEnviar,
  alDetener,
  enviando,
  agotado,
  maxCaracteres,
  limite,
  conSeguimientos,
  campo,
}: {
  valor: string;
  alCambiar: (texto: string) => void;
  alEnviar: () => void;
  alDetener: () => void;
  enviando: boolean;
  agotado: boolean;
  maxCaracteres: number;
  limite: number;
  conSeguimientos: boolean;
  campo: RefObject<HTMLTextAreaElement | null>;
}) {
  const [conVoz, setConVoz] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const reconocimiento = useRef<Reconocimiento | null>(null);
  const restantes = maxCaracteres - valor.length;

  useEffect(() => {
    setConVoz(reconocimientoDeVoz() !== null);
    return () => reconocimiento.current?.stop();
  }, []);

  // Crece con el texto hasta 6 líneas; después, el campo hace scroll.
  useLayoutEffect(() => {
    const elemento = campo.current;
    if (!elemento) return;
    elemento.style.height = 'auto';
    const linea = Number.parseFloat(getComputedStyle(elemento).lineHeight) || 24;
    const relleno = Number.parseFloat(getComputedStyle(elemento).paddingTop || '0') * 2;
    elemento.style.height = `${Math.min(elemento.scrollHeight, linea * MAX_LINEAS + relleno)}px`;
  }, [valor, campo]);

  const alTeclear = (evento: KeyboardEvent<HTMLTextAreaElement>) => {
    if (evento.nativeEvent.isComposing) return;
    if (evento.key === 'Escape' && enviando) {
      evento.preventDefault();
      alDetener();
      return;
    }
    if (evento.key === 'Enter' && !evento.shiftKey) {
      evento.preventDefault();
      if (!enviando) alEnviar();
    }
  };

  const dictar = () => {
    if (escuchando) {
      reconocimiento.current?.stop();
      return;
    }
    const Constructor = reconocimientoDeVoz();
    if (!Constructor) return;
    const instancia = new Constructor();
    instancia.lang = 'es-CO';
    instancia.interimResults = false;
    instancia.maxAlternatives = 1;
    instancia.onresult = (evento) => {
      const dicho = Array.from(evento.results)
        .map((resultado) => resultado[0]?.transcript ?? '')
        .join(' ')
        .trim();
      if (dicho) alCambiar(`${valor ? `${valor} ` : ''}${dicho}`.slice(0, maxCaracteres));
    };
    instancia.onend = () => setEscuchando(false);
    instancia.onerror = () => setEscuchando(false);
    reconocimiento.current = instancia;
    setEscuchando(true);
    instancia.start();
  };

  if (agotado) {
    return (
      <div className="chrono-entrada" style={{ '--orden': 3 } as CSSProperties}>
        <div role="status" className="rounded-[1.75rem] border border-borde-fuerte bg-campo px-5 py-4 text-sm text-texto">
          <p className="font-semibold">Llegaste a los {limite} mensajes de hoy. CHRONO vuelve mañana.</p>
          <p className="mt-1 text-texto-suave">El contador se reinicia a la medianoche (hora de Colombia).</p>
        </div>
        <AvisoSalud />
      </div>
    );
  }

  return (
    <div className="chrono-entrada" style={{ '--orden': 3 } as CSSProperties}>
      {conSeguimientos && !enviando ? (
        <ul aria-label="Seguimiento rápido" className="mb-2 flex flex-wrap gap-2">
          {SEGUIMIENTOS.map((texto) => (
            <li key={texto}>
              <button
                type="button"
                onClick={() => {
                  alCambiar(texto);
                  campo.current?.focus();
                }}
                className="min-h-11 rounded-full border border-borde bg-superficie px-3.5 text-sm text-texto transition-colors hover:border-primario hover:bg-primario-suave focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
              >
                {texto}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <form
        onSubmit={(evento) => {
          evento.preventDefault();
          if (!enviando) alEnviar();
        }}
        className="compositor-chrono flex items-end gap-2 rounded-[1.75rem] border p-2 pl-4"
      >
        <label htmlFor="chat-entrada" className="sr-only">
          Escribe tu mensaje
        </label>
        <textarea
          ref={campo}
          id="chat-entrada"
          value={valor}
          onChange={(evento) => alCambiar(evento.target.value)}
          onKeyDown={alTeclear}
          maxLength={maxCaracteres}
          rows={1}
          placeholder="Pregúntale a CHRONO…"
          className="compositor-campo max-h-60 min-h-11 flex-1 resize-none self-center border-0 bg-transparent py-2.5 text-base leading-6 text-texto outline-none placeholder:text-texto-suave"
        />
        {conVoz ? (
          <button
            type="button"
            onClick={dictar}
            aria-pressed={escuchando}
            aria-label={escuchando ? 'Dejar de dictar' : 'Dictar por voz'}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-texto-suave hover:bg-primario-suave hover:text-texto aria-pressed:bg-primario-suave aria-pressed:text-texto focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
          >
            <Icono nombre="microfono" />
          </button>
        ) : null}
        {enviando ? (
          <button
            type="button"
            onClick={alDetener}
            aria-label="Detener"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-borde-fuerte bg-superficie text-texto hover:bg-primario-suave focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
          >
            <Icono nombre="detener" className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="submit"
            aria-label="Enviar"
            disabled={!valor.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primario text-white transition-colors hover:bg-primario-fuerte disabled:bg-borde disabled:text-texto-suave focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
          >
            <Icono nombre="flechaArriba" />
          </button>
        )}
      </form>
      {restantes < AVISO_CARACTERES ? (
        <p className={`mt-1 text-right text-sm tabular-nums ${restantes <= 0 ? 'text-aviso' : 'text-texto-suave'}`} aria-live="polite">
          Quedan {Math.max(0, restantes)} caracteres
        </p>
      ) : null}
      <AvisoSalud />
    </div>
  );
}

function AvisoSalud() {
  return <p className="mt-2 text-center text-sm text-texto-suave">CHRONO puede equivocarse. No reemplaza a un profesional de la salud.</p>;
}
