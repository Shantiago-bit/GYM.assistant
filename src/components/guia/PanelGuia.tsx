'use client';

import { useEffect, useId, useRef } from 'react';
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

// Panel con los recorridos, su estado y la opción de repetirlos. Se abre desde "Guía" en el menú de perfil.
export function PanelGuia() {
  const { datos, iniciar, entrada, reiniciar, panelAbierto: abierto, cerrarPanel } = useGuia();
  const idPanel = useId();
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    contenedor.current?.focus();
    const cerrarYVolver = () => {
      cerrarPanel();
      // Devuelve el foco al menú de perfil si está a la vista.
      const boton = document.querySelector<HTMLElement>('[data-guia="menu-perfil"]');
      if (boton?.offsetParent) boton.focus();
    };
    const alPulsarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') cerrarYVolver();
    };
    const alPulsarFuera = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) cerrarPanel();
    };
    window.addEventListener('keydown', alPulsarTecla);
    window.addEventListener('mousedown', alPulsarFuera);
    return () => {
      window.removeEventListener('keydown', alPulsarTecla);
      window.removeEventListener('mousedown', alPulsarFuera);
    };
  }, [abierto, cerrarPanel]);

  if (!abierto) return null;

  return (
    <div
      ref={contenedor}
      id={idPanel}
      role="region"
      tabIndex={-1}
      aria-label="Recorridos de la guía"
      className="fixed inset-x-4 top-16 z-50 rounded-gym border border-borde bg-superficie p-3 text-texto shadow-soft outline-none md:inset-x-auto md:right-6 md:w-80 lg:right-10"
    >
      <p className="px-1 text-sm font-semibold">Guía de Gym Assistant</p>
      <p className="px-1 text-sm text-texto-suave">Recorridos sobre las pantallas reales.</p>
      <ul className="mt-2 space-y-1">
        {IDS_RECORRIDO.map((id) => {
          const recorrido = RECORRIDOS[id];
          const estado = datos?.recorridos[id]?.estado ?? 'pendiente';
          const disponible = entrada(id) !== null;
          return (
            <li key={id} className="flex items-center gap-2 rounded-gym px-1 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{recorrido.titulo}</p>
                <p className="text-sm text-texto-suave">
                  {TEXTO_ESTADO[estado]}
                  {disponible
                    ? ` · ${recorrido.descripcion}`
                    : ' · Necesitas un ejercicio adecuado para verla.'}
                </p>
              </div>
              <button
                type="button"
                disabled={!disponible}
                onClick={() => {
                  cerrarPanel();
                  iniciar(id);
                }}
                className="min-h-11 shrink-0 rounded-gym border border-borde px-3 py-2 text-sm font-semibold text-primario hover:bg-primario-suave disabled:cursor-not-allowed disabled:border-borde disabled:bg-borde disabled:text-texto-suave focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
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
          cerrarPanel();
          reiniciar();
        }}
        className="mt-2 min-h-11 px-1 text-sm text-texto-suave underline-offset-2 hover:underline"
      >
        Reiniciar el progreso de la guía
      </button>
    </div>
  );
}
