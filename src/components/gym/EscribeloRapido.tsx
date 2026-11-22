'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Boton } from '@/components/ui/Boton';
import { Icono } from '@/components/ui/Icono';
import { enviarJson } from '@/lib/http/cliente';
import type { TipoEjercicio } from '@/lib/reglas/ejercicio';
import {
  EJEMPLOS_INTERPRETE,
  interpretarSeries,
  textoSerieInterpretada,
  type ResultadoInterpretacion,
  type SerieInterpretada,
} from '@/lib/reglas/lenguaje';

// API de voz del navegador (Chrome la llama webkitSpeechRecognition). Solo lo que se usa aquí.
interface Reconocimiento {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((evento: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type ConstructorReconocimiento = new () => Reconocimiento;

export function reconocimientoDeVoz(): ConstructorReconocimiento | null {
  if (typeof window === 'undefined') return null;
  const ventana = window as unknown as { SpeechRecognition?: ConstructorReconocimiento; webkitSpeechRecognition?: ConstructorReconocimiento };
  return ventana.SpeechRecognition ?? ventana.webkitSpeechRecognition ?? null;
}

// "Escríbelo rápido": la persona escribe o dicta sus series en lenguaje natural, ve una vista previa y decide si
// llenan el formulario. Nunca guarda: "Usar estas series" solo llena las filas, que se revisan y se guardan aparte.
export function EscribeloRapido({
  tipo,
  pesoActualKg,
  onUsar,
}: {
  tipo: TipoEjercicio;
  pesoActualKg: number | null;
  onUsar: (series: SerieInterpretada[]) => void;
}) {
  const id = useId();
  const [texto, setTexto] = useState('');
  const [deChrono, setDeChrono] = useState<ResultadoInterpretacion | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  const [errorChrono, setErrorChrono] = useState('');
  const [usadas, setUsadas] = useState(false);
  // El micrófono solo aparece si el navegador tiene reconocimiento de voz (se detecta al montar, no en el servidor).
  const [conVoz, setConVoz] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const reconocimiento = useRef<Reconocimiento | null>(null);

  useEffect(() => {
    setConVoz(reconocimientoDeVoz() !== null);
    return () => reconocimiento.current?.stop();
  }, []);

  const contexto = { tipo, pesoActualGramos: pesoActualKg === null ? null : Math.round(pesoActualKg * 1000) };
  const local = texto.trim() ? interpretarSeries(texto, contexto) : null;
  const resultado = deChrono ?? local;

  const cambiarTexto = (valor: string) => {
    setTexto(valor);
    setDeChrono(null);
    setErrorChrono('');
    setUsadas(false);
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
        .map((resultadoVoz) => resultadoVoz[0]?.transcript ?? '')
        .join(' ')
        .trim();
      if (dicho) cambiarTexto(dicho);
    };
    instancia.onend = () => setEscuchando(false);
    instancia.onerror = () => setEscuchando(false);
    reconocimiento.current = instancia;
    setEscuchando(true);
    instancia.start();
  };

  const preguntarAChrono = async () => {
    setPidiendo(true);
    setErrorChrono('');
    const respuesta = await enviarJson<{ series: SerieInterpretada[]; avisos: string[] }>('/api/gym/interpretar', {
      texto,
      tipo,
      ...(pesoActualKg === null ? {} : { pesoActualKg }),
    });
    setPidiendo(false);
    if (!respuesta.ok) {
      setErrorChrono(respuesta.mensaje);
      return;
    }
    setDeChrono({ ok: true, series: respuesta.datos.series, avisos: [...respuesta.datos.avisos, 'Lo interpretó CHRONO: revísalo antes de usarlo.'] });
  };

  return (
    <div className="rounded-boton border border-borde bg-fondo p-3" data-guia="escribelo-rapido">
      <label htmlFor={`${id}-texto`} className="block text-sm font-semibold text-texto">
        Escríbelo rápido
      </label>
      <p id={`${id}-ayuda`} className="text-sm text-texto-suave">
        Escribe {conVoz ? 'o dicta ' : ''}tus series como las dirías; nada se guarda hasta que tú lo confirmes.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          id={`${id}-texto`}
          type="text"
          value={texto}
          onChange={(evento) => cambiarTexto(evento.target.value)}
          placeholder={tipo === 'peso' ? 'Ej.: 3x10 40 · 60 kg: 10, 8, 7 · rir 2' : 'Ej.: 8 7 6 · 3x12 · la última al fallo'}
          aria-describedby={`${id}-ayuda ${id}-estado`}
          autoComplete="off"
          className="min-h-11 min-w-0 flex-1 rounded-boton border border-borde bg-superficie px-3 text-base text-texto focus:border-primario focus:outline-none focus:ring-2 focus:ring-primario-suave"
        />
        {conVoz ? (
          <button
            type="button"
            onClick={dictar}
            aria-pressed={escuchando}
            aria-label={escuchando ? 'Dejar de escuchar' : 'Dictar las series'}
            data-guia="microfono"
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario ${
              escuchando ? 'border-primario bg-primario text-white' : 'border-borde bg-superficie text-primario hover:bg-primario-suave'
            }`}
          >
            <Icono nombre="microfono" />
          </button>
        ) : null}
      </div>

      <div id={`${id}-estado`} aria-live="polite" className="mt-2 space-y-2">
        {escuchando ? (
          <p className="flex items-center gap-2 text-sm font-medium text-primario">
            Escuchando
            <span aria-hidden="true" className="inline-flex gap-1">
              <span className="punto-respira h-1.5 w-1.5 rounded-full bg-primario" />
              <span className="punto-respira h-1.5 w-1.5 rounded-full bg-primario" />
              <span className="punto-respira h-1.5 w-1.5 rounded-full bg-primario" />
            </span>
          </p>
        ) : null}

        {resultado?.ok ? (
          <>
            <ul aria-label="Vista previa de las series" className="flex flex-wrap gap-1.5">
              {resultado.series.map((serie, indice) => (
                <li
                  // eslint-disable-next-line react/no-array-index-key -- las series no tienen id; el orden es su identidad
                  key={indice}
                  className={`rounded-full px-2.5 py-1 text-sm font-medium ${
                    serie.tecnica === 'aproximacion' ? 'bg-superficie text-texto-suave ring-1 ring-borde' : 'bg-primario-suave text-texto'
                  }`}
                >
                  <span className="sr-only">Serie {indice + 1}: </span>
                  {textoSerieInterpretada(serie)}
                </li>
              ))}
            </ul>
            {resultado.avisos.map((aviso) => (
              <p key={aviso} className="text-sm text-texto-suave">
                {aviso}
              </p>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <Boton
                variante="secundario"
                onClick={() => {
                  onUsar(resultado.series);
                  setUsadas(true);
                }}
              >
                Usar estas series
              </Boton>
              {usadas ? <span className="text-sm text-texto">Listo: revisa las filas de abajo y guarda cuando quieras.</span> : null}
            </div>
          </>
        ) : resultado && !resultado.ok ? (
          <>
            <p className="text-sm text-texto">{resultado.error.replace(/ Prueba así:.*$/, '')}</p>
            <p className="text-sm text-texto-suave">Por ejemplo:</p>
            <ul className="flex flex-wrap gap-1.5" aria-label="Ejemplos">
              {EJEMPLOS_INTERPRETE.map((ejemplo) => (
                <li key={ejemplo}>
                  <button
                    type="button"
                    onClick={() => cambiarTexto(ejemplo)}
                    className="inline-flex min-h-11 items-center rounded-full border border-borde bg-superficie px-3 text-sm text-texto hover:border-primario focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
                  >
                    {ejemplo}
                  </button>
                </li>
              ))}
            </ul>
            {/* Solo cuando no se entendió (no para un peso en libras o un valor imposible). */}
            {resultado.error.startsWith('No entendí') ? (
              <Boton variante="fantasma" cargando={pidiendo} onClick={() => void preguntarAChrono()}>
                Que CHRONO lo interprete
              </Boton>
            ) : null}
            {errorChrono ? <p className="text-sm font-medium text-peligro">{errorChrono}</p> : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
