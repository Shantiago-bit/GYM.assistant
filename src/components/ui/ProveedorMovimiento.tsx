'use client';

import { LazyMotion, MotionConfig } from 'framer-motion';
import { useSyncExternalStore, type ReactNode } from 'react';
import { leerNivel, NIVEL_POR_DEFECTO, type NivelAnimacion } from '@/lib/reglas/animacion';

// Las funciones de animación (incluidas las de layout: layoutId y listas que se reordenan) se cargan aparte y sin
// bloquear: la página no pesa más por ellas. `strict` obliga a usar el componente `m` en lugar de `motion`.
const cargarFunciones = () => import('./funcionesMovimiento').then((modulo) => modulo.default);

export const EVENTO_MOVIMIENTO = 'kairos:movimiento';

export interface EstadoMovimiento {
  nivel: NivelAnimacion; // el efectivo: "minimas" si el sistema pide reducir el movimiento
  elegido: NivelAnimacion; // lo que eligió la persona en su perfil
  sistemaReduce: boolean;
  vibracion: boolean;
}

// El script del <head> (SCRIPT_NIVEL) deja el nivel en <html data-animacion data-movimiento data-vibracion>
// antes de pintar; aquí se lee de ahí. En el servidor (y en pruebas sin el script), el nivel por defecto, salvo
// que el sistema pida reducir el movimiento.
function leerEstado(): string {
  if (typeof document === 'undefined') return `${NIVEL_POR_DEFECTO}|${NIVEL_POR_DEFECTO}|0|1`;
  const d = document.documentElement.dataset;
  const sistemaReduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const elegido = leerNivel(d.animacion);
  const nivel = sistemaReduce ? 'minimas' : d.movimiento ? leerNivel(d.movimiento) : elegido;
  return `${nivel}|${elegido}|${sistemaReduce ? 1 : 0}|${d.vibracion === 'no' ? 0 : 1}`;
}

function suscribir(avisar: () => void) {
  window.addEventListener(EVENTO_MOVIMIENTO, avisar);
  const consulta = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  consulta?.addEventListener?.('change', avisar);
  return () => {
    window.removeEventListener(EVENTO_MOVIMIENTO, avisar);
    consulta?.removeEventListener?.('change', avisar);
  };
}

const servidor = () => `${NIVEL_POR_DEFECTO}|${NIVEL_POR_DEFECTO}|0|1`;

// El nivel de movimiento efectivo y la preferencia de vibración. Cada efecto expresivo lo consulta.
export function useNivelMovimiento(): EstadoMovimiento {
  const valor = useSyncExternalStore(suscribir, leerEstado, servidor);
  const [nivel, elegido, reduce, vibracion] = valor.split('|');
  return { nivel: leerNivel(nivel), elegido: leerNivel(elegido), sistemaReduce: reduce === '1', vibracion: vibracion === '1' };
}

// Cambia el nivel en esta página (tras guardarlo en el perfil): cookies, <html> y aviso a los componentes.
export function aplicarNivelMovimiento(elegido: NivelAnimacion, vibracion: boolean) {
  const d = document.documentElement.dataset;
  const unAnio = 60 * 60 * 24 * 365;
  document.cookie = `kairos_animacion=${elegido}; path=/; max-age=${unAnio}; samesite=lax`;
  document.cookie = `kairos_vibracion=${vibracion ? '1' : '0'}; path=/; max-age=${unAnio}; samesite=lax`;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  d.animacion = elegido;
  d.movimiento = reduce ? 'minimas' : elegido;
  d.vibracion = vibracion ? 'si' : 'no';
  window.dispatchEvent(new Event(EVENTO_MOVIMIENTO));
}

// Con "reducir movimiento" en el sistema o el nivel "Mínimas", framer-motion no anima transformaciones ni
// posiciones (solo la opacidad), y los componentes con contador o confeti muestran su estado final.
export function ProveedorMovimiento({ children }: { children: ReactNode }) {
  const { nivel } = useNivelMovimiento();
  return (
    <LazyMotion features={cargarFunciones} strict>
      <MotionConfig reducedMotion={nivel === 'minimas' ? 'always' : 'user'}>{children}</MotionConfig>
    </LazyMotion>
  );
}
