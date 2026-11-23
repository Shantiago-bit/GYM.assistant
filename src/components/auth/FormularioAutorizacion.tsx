'use client';

import { useRef, useState } from 'react';

type Paso = 'elegir' | 'confirmar-rechazo' | 'listo';

const BOTON =
  'w-full rounded-2xl px-4 py-3 text-base font-semibold transition disabled:cursor-not-allowed disabled:border-borde disabled:bg-borde disabled:bg-none disabled:text-texto disabled:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario';

// El tutor elige Autorizo o No autorizo. Rechazar borra la cuenta, así que pide una confirmación.
export function FormularioAutorizacion({ token, apodo }: { token: string; apodo: string }) {
  const [paso, setPaso] = useState<Paso>('elegir');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);
  const resultado = useRef<HTMLParagraphElement>(null);

  const responder = async (decision: 'aprobar' | 'rechazar') => {
    setEnviando(true);
    setMensaje(null);
    try {
      const respuesta = await fetch('/api/autorizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, decision }),
      });
      const cuerpo = (await respuesta.json()) as { ok: boolean; datos?: { mensaje: string }; error?: { mensaje: string } };
      if (cuerpo.ok) {
        setPaso('listo');
        setMensaje({ texto: cuerpo.datos?.mensaje ?? 'Listo.', error: false });
      } else {
        // Usado, vencido o inválido: ya no hay nada que elegir.
        if (respuesta.status === 404 || respuesta.status === 409 || respuesta.status === 410) setPaso('listo');
        setMensaje({ texto: cuerpo.error?.mensaje ?? 'No se pudo registrar tu respuesta.', error: true });
      }
    } catch {
      setMensaje({ texto: 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.', error: true });
    } finally {
      setEnviando(false);
      requestAnimationFrame(() => resultado.current?.focus());
    }
  };

  return (
    <div className="space-y-4">
      {paso === 'elegir' ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={enviando}
            onClick={() => void responder('aprobar')}
            className={`${BOTON} bg-gradient-to-r from-primario to-primario-fuerte text-white shadow-elevada`}
          >
            {enviando ? 'Guardando…' : 'Autorizo la cuenta'}
          </button>
          <button
            type="button"
            disabled={enviando}
            onClick={() => setPaso('confirmar-rechazo')}
            className={`${BOTON} border border-borde bg-superficie text-texto hover:bg-fondo`}
          >
            No autorizo
          </button>
        </div>
      ) : null}

      {paso === 'confirmar-rechazo' ? (
        <div role="group" aria-labelledby="titulo-rechazo" className="rounded-2xl border border-peligro bg-peligro-suave p-4">
          <p id="titulo-rechazo" className="font-semibold text-peligro">
            ¿Seguro que no autorizas la cuenta de {apodo}?
          </p>
          <p className="mt-1 text-sm text-peligro">La cuenta y todos sus datos se eliminarán. Esto no se puede deshacer.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={enviando}
              onClick={() => void responder('rechazar')}
              className={`${BOTON} bg-peligro text-fondo hover:bg-peligro`}
            >
              {enviando ? 'Eliminando…' : 'Sí, no autorizo'}
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={() => setPaso('elegir')}
              className={`${BOTON} border border-borde bg-superficie text-texto hover:bg-fondo`}
            >
              Volver
            </button>
          </div>
        </div>
      ) : null}

      {mensaje ? (
        <p
          ref={resultado}
          tabIndex={-1}
          role={mensaje.error ? 'alert' : 'status'}
          className={`rounded-2xl px-4 py-3 text-sm font-medium outline-none ${
            mensaje.error ? 'bg-peligro-suave text-peligro' : 'bg-primario-suave text-primario'
          }`}
        >
          {mensaje.texto}
        </p>
      ) : null}
    </div>
  );
}
