'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { ADMIN_AVISO_INACTIVIDAD_SEGUNDOS, ADMIN_INACTIVIDAD_MINUTOS } from '@/lib/config/gym';
import { supabase } from '@/lib/supabase';

const EVENTOS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

async function cerrarSesionPorInactividad() {
  try {
    await supabase?.auth.signOut();
  } finally {
    window.location.assign('/login?motivo=inactividad');
  }
}

// Cierra la sesión tras `minutos` sin actividad en /admin. Un minuto antes avisa, con un botón para seguir
// (WCAG 2.2.1: la persona puede ampliar el tiempo). Mientras el aviso está abierto, solo el botón lo reinicia.
export function VigilanteInactividad({
  minutos = ADMIN_INACTIVIDAD_MINUTOS,
  avisoSegundos = ADMIN_AVISO_INACTIVIDAD_SEGUNDOS,
  alCerrarSesion = cerrarSesionPorInactividad,
}: {
  minutos?: number;
  avisoSegundos?: number;
  alCerrarSesion?: () => void | Promise<void>;
}) {
  const [aviso, setAviso] = useState(false);
  const avisoAbierto = useRef(false);
  const temporizadores = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cerrar = useRef(alCerrarSesion);
  cerrar.current = alCerrarSesion;

  const reiniciar = useCallback(() => {
    temporizadores.current.forEach(clearTimeout);
    const total = minutos * 60_000;
    temporizadores.current = [
      setTimeout(() => {
        avisoAbierto.current = true;
        setAviso(true);
      }, Math.max(total - avisoSegundos * 1000, 0)),
      setTimeout(() => void cerrar.current(), total),
    ];
  }, [minutos, avisoSegundos]);

  useEffect(() => {
    reiniciar();
    let ultima = 0;
    const alActuar = () => {
      const ahora = Date.now();
      if (avisoAbierto.current || ahora - ultima < 1000) return;
      ultima = ahora;
      reiniciar();
    };
    EVENTOS.forEach((evento) => window.addEventListener(evento, alActuar, { passive: true }));
    return () => {
      EVENTOS.forEach((evento) => window.removeEventListener(evento, alActuar));
      temporizadores.current.forEach(clearTimeout);
    };
  }, [reiniciar]);

  const seguir = () => {
    avisoAbierto.current = false;
    setAviso(false);
    reiniciar();
  };

  if (!aviso) return null;
  return (
    <Modal titulo="¿Sigues ahí?" onCerrar={seguir}>
      <p className="text-sm text-texto">
        Por seguridad, la sesión de administración se cerrará en {avisoSegundos} segundos por inactividad.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Boton onClick={seguir}>Seguir aquí</Boton>
        <Boton variante="secundario" onClick={() => void cerrar.current()}>
          Cerrar sesión ahora
        </Boton>
      </div>
    </Modal>
  );
}
