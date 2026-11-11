'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useGuia } from '@/components/guia/ProveedorGuia';
import { IDS_RECORRIDO, RECORRIDOS, type EstadoRecorrido } from '@/lib/guia/recorridos';

const TEXTO_ESTADO: Record<EstadoRecorrido, string> = {
  pendiente: 'Pendiente',
  en_curso: 'En curso',
  completado: 'Completado',
  saltado: 'Saltado',
};

const ACCION: Record<EstadoRecorrido, string> = {
  pendiente: 'Empezar',
  en_curso: 'Continuar',
  completado: 'Repetir',
  saltado: 'Repetir',
};

// Botón "Guía" del menú: abre un panel con los recorridos, su estado y la opción de repetirlos.
export function PanelGuia({ alElegir, claseBoton }: { alElegir?: () => void; claseBoton: string }) {
  const { datos, iniciar, entrada, reiniciar } = useGuia();
  const [abierto, setAbierto] = useState(false);
  const idPanel = useId();
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alPulsarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false);
    };
    const alPulsarFuera = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false);
    };
    window.addEventListener('keydown', alPulsarTecla);
    window.addEventListener('mousedown', alPulsarFuera);
    return () => {
      window.removeEventListener('keydown', alPulsarTecla);
      window.removeEventListener('mousedown', alPulsarFuera);
    };
  }, [abierto]);

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        data-guia="boton-guia"
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={() => setAbierto((actual) => !actual)}
        className={claseBoton}
      >
        Guía
      </button>
      {abierto ? (
        <div
          id={idPanel}
          role="region"
          aria-label="Recorridos de la guía"
          className="fixed inset-x-4 top-16 z-50 rounded-gym border border-borde bg-superficie p-3 text-texto shadow-soft md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-2 md:w-80"
        >
          <p className="px-1 text-sm font-semibold">Guía de Gym Assistant</p>
          <p className="px-1 text-xs text-texto-suave">Recorridos sobre las pantallas reales.</p>
          <ul className="mt-2 space-y-1">
            {IDS_RECORRIDO.map((id) => {
              const recorrido = RECORRIDOS[id];
              const estado = datos?.recorridos[id]?.estado ?? 'pendiente';
              const disponible = entrada(id) !== null;
              return (
                <li key={id} className="flex items-center gap-2 rounded-gym px-1 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{recorrido.titulo}</p>
                    <p className="text-xs text-texto-suave">
                      {TEXTO_ESTADO[estado]}
                      {disponible ? ` · ${recorrido.descripcion}` : ' · Necesitas un ejercicio adecuado para verla.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!disponible}
                    onClick={() => {
                      setAbierto(false);
                      alElegir?.();
                      iniciar(id);
                    }}
                    className="shrink-0 rounded-gym border border-borde px-2.5 py-1 text-xs font-semibold text-primario hover:bg-primario-suave disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
                  >
                    {ACCION[estado]}
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => {
              setAbierto(false);
              reiniciar();
            }}
            className="mt-2 px-1 text-xs text-texto-suave underline-offset-2 hover:underline"
          >
            Reiniciar el progreso de la guía
          </button>
        </div>
      ) : null}
    </div>
  );
}
