'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { enviarJson } from '@/lib/http/cliente';

export const ETIQUETA_MODO = 'Opciones avanzadas: métodos de series, RIR y técnicas';

// Interruptor del modo avanzado (role="switch"). Se guarda al tocarlo; si falla, vuelve a como estaba.
export function InterruptorModo({ inicial }: { inicial: boolean }) {
  const router = useRouter();
  const [avanzado, setAvanzado] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);
  const idEtiqueta = useId();
  const idDescripcion = useId();

  const cambiar = async () => {
    const nuevo = !avanzado;
    setAvanzado(nuevo);
    setGuardando(true);
    setMensaje(null);
    const respuesta = await enviarJson<{ avanzado: boolean }>('/api/gym/perfil/modo', { avanzado: nuevo });
    setGuardando(false);
    if (!respuesta.ok) {
      setAvanzado(!nuevo);
      setMensaje({ texto: `No se pudo guardar: ${respuesta.mensaje}`, error: true });
      return;
    }
    setMensaje({
      texto: nuevo
        ? 'Listo: verás los métodos de series, el RIR y las técnicas.'
        : 'Listo: la app usará palabras sencillas y te pedirá solo lo necesario.',
      error: false,
    });
    router.refresh();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p id={idEtiqueta} className="font-medium text-texto">
            {ETIQUETA_MODO}
          </p>
          <p id={idDescripcion} className="mt-1 text-sm text-texto-suave">
            Apagadas, la app usa palabras sencillas y solo te pide repeticiones y peso. Tus ejercicios y tus sesiones
            no cambian.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={avanzado}
          aria-labelledby={idEtiqueta}
          aria-describedby={idDescripcion}
          aria-busy={guardando}
          disabled={guardando}
          onClick={() => void cambiar()}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario disabled:opacity-60"
        >
          <span
            aria-hidden="true"
            className={`relative inline-flex h-7 w-12 items-center rounded-full border-2 transition-colors motion-reduce:transition-none ${
              avanzado ? 'border-primario bg-primario' : 'border-texto-suave bg-superficie'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full transition-transform motion-reduce:transition-none ${
                avanzado ? 'translate-x-5 bg-white' : 'translate-x-0.5 bg-texto-suave'
              }`}
            />
          </span>
          <span className="sr-only">{avanzado ? 'Activadas' : 'Apagadas'}</span>
        </button>
      </div>
      <p role="status" className={`text-sm ${mensaje?.error ? 'text-red-700' : 'text-texto'}`}>
        {mensaje?.texto ?? ''}
      </p>
    </div>
  );
}
