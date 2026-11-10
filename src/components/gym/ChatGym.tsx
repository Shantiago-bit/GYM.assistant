'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { MarkdownChat } from '@/components/gym/MarkdownChat';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { CHAT_MAX_CARACTERES, CHAT_MAX_MENSAJES } from '@/lib/config/gym';
import type { EventoChat, MensajeChat } from '@/lib/chat/asistente';

const SUGERENCIAS = [
  'Arma una rutina para esta semana con mis ejercicios',
  '¿Cómo voy en mis ejercicios?',
  '¿Qué debo hacer en mi próxima sesión?',
  '¿Cómo funciona la doble progresión?',
];

const ESTADO_HERRAMIENTA: Record<string, string> = {
  listar_ejercicios: 'Revisando tus ejercicios…',
  ver_ejercicio: 'Revisando el historial del ejercicio…',
  resumen_periodo: 'Revisando tu resumen…',
  crear_ejercicio: 'Creando el ejercicio…',
};

function leerGuardado(clave: string): MensajeChat[] {
  try {
    const guardado = sessionStorage.getItem(clave);
    return guardado ? (JSON.parse(guardado) as MensajeChat[]) : [];
  } catch {
    return [];
  }
}

async function leerError(respuesta: Response): Promise<string> {
  try {
    const cuerpo = (await respuesta.json()) as { error?: { mensaje?: string } | string };
    const mensaje = typeof cuerpo.error === 'string' ? cuerpo.error : cuerpo.error?.mensaje;
    return mensaje ?? 'No se pudo enviar el mensaje.';
  } catch {
    return 'No se pudo enviar el mensaje.';
  }
}

export function ChatGym({ usuarioId }: { usuarioId: string }) {
  // La conversación vive en la pestaña: sobrevive a la navegación dentro de /gym, no al cerrar el navegador.
  const claveGuardado = `gym-chat:${usuarioId}`;
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [entrada, setEntrada] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState('');
  const [error, setError] = useState('');
  const controlador = useRef<AbortController | null>(null);
  const final = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMensajes(leerGuardado(claveGuardado));
    return () => controlador.current?.abort();
  }, [claveGuardado]);

  useEffect(() => {
    if (enviando) {
      return;
    }
    try {
      sessionStorage.setItem(claveGuardado, JSON.stringify(mensajes));
    } catch {
      // Sin almacenamiento la conversación sigue funcionando, solo no se conserva.
    }
  }, [mensajes, enviando, claveGuardado]);

  useEffect(() => {
    final.current?.scrollIntoView({ block: 'end' });
  }, [mensajes, estado]);

  const agregarAlUltimo = (texto: string) =>
    setMensajes((actuales) => {
      const copia = [...actuales];
      const ultimo = copia.at(-1);
      if (ultimo?.rol === 'asistente') {
        copia[copia.length - 1] = { ...ultimo, texto: ultimo.texto + texto };
      }
      return copia;
    });

  const quitarRespuestaVacia = () =>
    setMensajes((actuales) => {
      const ultimo = actuales.at(-1);
      return ultimo?.rol === 'asistente' && !ultimo.texto.trim() ? actuales.slice(0, -1) : actuales;
    });

  const enviar = async (texto: string) => {
    const pregunta = texto.trim();
    if (!pregunta || enviando) {
      return;
    }

    const historial = [...mensajes, { rol: 'usuario', texto: pregunta } satisfies MensajeChat];
    setMensajes([...historial, { rol: 'asistente', texto: '' }]);
    setEntrada('');
    setError('');
    setEstado('ATLAS está pensando…');
    setEnviando(true);
    controlador.current = new AbortController();

    try {
      const respuesta = await fetch('/api/gym/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensajes: historial.slice(-CHAT_MAX_MENSAJES) }),
        signal: controlador.current.signal,
      });

      if (!respuesta.ok || !respuesta.body) {
        setError(await leerError(respuesta));
        quitarRespuestaVacia();
        return;
      }

      const lector = respuesta.body.pipeThrough(new TextDecoderStream()).getReader();
      let pendiente = '';
      for (;;) {
        const { value, done } = await lector.read();
        if (done) {
          break;
        }
        pendiente += value;
        const lineas = pendiente.split('\n');
        pendiente = lineas.pop() ?? '';
        for (const linea of lineas) {
          if (!linea.trim()) {
            continue;
          }
          const evento = JSON.parse(linea) as EventoChat;
          if (evento.tipo === 'texto') {
            setEstado('');
            agregarAlUltimo(evento.texto);
          } else if (evento.tipo === 'herramienta') {
            setEstado(ESTADO_HERRAMIENTA[evento.nombre] ?? 'Consultando tus datos…');
          } else if (evento.tipo === 'error') {
            setError(evento.mensaje);
          }
        }
      }
    } catch (falla) {
      if (!(falla instanceof DOMException && falla.name === 'AbortError')) {
        setError('Se perdió la conexión con ATLAS. Intenta de nuevo.');
      }
    } finally {
      quitarRespuestaVacia();
      setEstado('');
      setEnviando(false);
      controlador.current = null;
    }
  };

  const alEnviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    void enviar(entrada);
  };

  const alTeclear = (evento: KeyboardEvent<HTMLTextAreaElement>) => {
    if (evento.key === 'Enter' && !evento.shiftKey && !evento.nativeEvent.isComposing) {
      evento.preventDefault();
      void enviar(entrada);
    }
  };

  const nuevaConversacion = () => {
    controlador.current?.abort();
    setMensajes([]);
    setError('');
  };

  return (
    <section className="flex h-[calc(100dvh-8.5rem)] min-h-[30rem] flex-col overflow-hidden rounded-gym border border-borde bg-superficie lg:h-[calc(100dvh-10rem)]">
      <div className="flex items-center justify-between gap-3 border-b border-borde px-4 py-3">
        <div>
          <h1 className="text-lg font-bold tracking-wide text-texto">ATLAS</h1>
          <p className="text-xs text-texto-suave">Asistente virtual de Gym Assistant</p>
        </div>
        {mensajes.length > 0 ? (
          <Boton variante="fantasma" className="whitespace-nowrap" onClick={nuevaConversacion}>
            Nuevo chat
          </Boton>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
        {mensajes.length === 0 ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-gym bg-primario text-xl font-bold text-white">
              A
            </div>
            <h2 className="text-xl font-bold text-texto">Hola, soy ATLAS</h2>
            <p className="mt-1 max-w-md text-sm text-texto-suave">
              Tu asistente virtual de entrenamiento. Conozco tus ejercicios, sesiones y recomendaciones: pregúntame lo
              que necesites o pídeme una rutina.
            </p>
            <div className="mt-5 grid w-full gap-2 sm:grid-cols-2">
              {SUGERENCIAS.map((sugerencia) => (
                <button
                  key={sugerencia}
                  type="button"
                  onClick={() => void enviar(sugerencia)}
                  className="rounded-gym border border-borde bg-fondo px-3 py-2.5 text-left text-sm text-texto transition hover:border-primario hover:bg-primario-suave focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
                >
                  {sugerencia}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="mx-auto flex max-w-3xl flex-col gap-4">
            {mensajes.map((mensaje, indice) =>
              mensaje.rol === 'usuario' ? (
                <li key={indice} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-gym bg-primario px-3.5 py-2.5 text-sm text-white">
                    {mensaje.texto}
                  </p>
                </li>
              ) : mensaje.texto ? (
                <li key={indice} className="flex flex-col items-start gap-1">
                  <span className="text-xs font-semibold tracking-wide text-primario">ATLAS</span>
                  <div className="max-w-full rounded-gym border border-borde bg-fondo px-3.5 py-2.5 text-sm leading-relaxed text-texto sm:max-w-[90%]">
                    <MarkdownChat texto={mensaje.texto} />
                  </div>
                </li>
              ) : null,
            )}
            {estado ? (
              <li className="flex items-center gap-2 text-sm text-texto-suave" role="status">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primario" aria-hidden="true" />
                {estado}
              </li>
            ) : null}
          </ol>
        )}
        <div ref={final} />
      </div>

      <form onSubmit={alEnviar} className="border-t border-borde p-3">
        {error ? (
          <div className="mb-2">
            <Aviso tipo="error">{error}</Aviso>
          </div>
        ) : null}
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <label htmlFor="chat-entrada" className="sr-only">
            Escribe tu mensaje
          </label>
          <textarea
            id="chat-entrada"
            value={entrada}
            onChange={(evento) => setEntrada(evento.target.value)}
            onKeyDown={alTeclear}
            maxLength={CHAT_MAX_CARACTERES}
            rows={1}
            placeholder="Escribe tu pregunta…"
            className="max-h-40 min-h-11 flex-1 resize-y rounded-gym border border-borde bg-fondo px-3 py-2.5 text-sm text-texto outline-none focus:border-primario focus:ring-2 focus:ring-primario-suave"
          />
          {enviando ? (
            <Boton variante="secundario" onClick={() => controlador.current?.abort()}>
              Detener
            </Boton>
          ) : (
            <Boton type="submit" disabled={!entrada.trim()}>
              Enviar
            </Boton>
          )}
        </div>
        <p className="mx-auto mt-1.5 max-w-3xl text-xs text-texto-suave">
          ATLAS puede equivocarse. No reemplaza a un profesional de la salud.
        </p>
      </form>
    </section>
  );
}
