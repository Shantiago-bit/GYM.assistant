'use client';

import { useEffect, useRef, useState } from 'react';
import { Icono } from '@/components/ui/Icono';

interface Bloqueo {
  release: () => Promise<void>;
}
type NavegadorConBloqueo = Navigator & { wakeLock?: { request: (tipo: 'screen') => Promise<Bloqueo> } };

// "Modo gimnasio": mientras se anota una sesión, la pantalla no se apaga (Wake Lock API). Empieza encendido si el
// navegador lo permite; el interruptor lo apaga. Se libera al salir de la página, y se vuelve a pedir si la
// pestaña vuelve a estar visible (el navegador lo suelta al ocultarla). Sin soporte, el interruptor no aparece.
export function ModoGimnasio() {
  const [soportado, setSoportado] = useState(false);
  const [activo, setActivo] = useState(true);
  const [encendido, setEncendido] = useState(false);
  const bloqueo = useRef<Bloqueo | null>(null);

  useEffect(() => {
    setSoportado(typeof navigator !== 'undefined' && 'wakeLock' in navigator);
  }, []);

  useEffect(() => {
    if (!soportado) return;
    let cancelado = false;
    const pedir = async () => {
      if (!activo || document.visibilityState !== 'visible') return;
      try {
        const nuevo = await (navigator as NavegadorConBloqueo).wakeLock!.request('screen');
        if (cancelado) {
          void nuevo.release();
          return;
        }
        bloqueo.current = nuevo;
        setEncendido(true);
      } catch {
        setEncendido(false);
      }
    };
    const soltar = () => {
      void bloqueo.current?.release().catch(() => undefined);
      bloqueo.current = null;
      setEncendido(false);
    };
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'visible') void pedir();
    };
    if (activo) void pedir();
    else soltar();
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    return () => {
      cancelado = true;
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      soltar();
    };
  }, [soportado, activo]);

  if (!soportado) return null;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => setActivo((valor) => !valor)}
      data-guia="modo-gimnasio"
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-borde bg-superficie px-3 text-sm font-medium text-texto hover:border-primario focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
    >
      <Icono nombre="sol" className={`h-4 w-4 ${activo ? 'text-primario' : 'text-texto-suave'}`} />
      Modo gimnasio: {activo ? (encendido ? 'pantalla encendida' : 'activado') : 'apagado'}
    </button>
  );
}
