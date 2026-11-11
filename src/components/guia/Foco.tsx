'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { buscarObjetivo } from '@/lib/guia/acciones';
import { cumpleCondicion, objetivos } from '@/lib/guia/motor';
import { huecoDe, type Rectangulo } from '@/lib/guia/posicion';
import type { PasoGuia } from '@/lib/guia/recorridos';

// El fondo se arma con 4 rectángulos alrededor del hueco, cada uno oscuro y con backdrop-filter: blur.
// Se eligió en lugar de una máscara CSS porque Safari de iOS no aplica bien mask-image junto con
// backdrop-filter; con rectángulos el hueco queda nítido en Chrome, Firefox y Safari. Las esquinas del
// hueco las dibuja el anillo redondeado que va encima.

const INTENTOS = 15; // la página puede estar terminando de cargar: se reintenta durante ~1,5 s
const ESPERA_MS = 100;

export interface InfoFoco {
  hueco: Rectangulo | null;
  objetivo: HTMLElement | null;
  condicionCumplida: boolean;
}

interface PropiedadesFoco {
  paso: PasoGuia;
  onSinObjetivo: () => void;
  onNavegar: () => void;
  onAvanzar: () => void;
  children: (info: InfoFoco) => ReactNode;
}

function leerTexto(elemento: HTMLElement): boolean {
  const campos = elemento.matches('input, textarea')
    ? [elemento as HTMLInputElement]
    : Array.from(elemento.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea'));
  return campos.some((campo) => campo.value.trim() !== '');
}

function Bloque({ style }: { style: React.CSSProperties }) {
  return <div aria-hidden="true" className="pointer-events-auto fixed bg-black/55 backdrop-blur-[4px]" style={style} />;
}

export function Foco({ paso, onSinObjetivo, onNavegar, onAvanzar, children }: PropiedadesFoco) {
  const reducir = useReducedMotion() ?? false;
  const [objetivo, setObjetivo] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<Rectangulo | null>(null);
  const [lectura, setLectura] = useState({ hayTexto: false, cambiado: false });
  const [ventana, setVentana] = useState({ ancho: 0, alto: 0 });
  // Las funciones del proveedor cambian en cada render: se leen siempre desde refs.
  const llamadas = useRef({ onSinObjetivo, onNavegar, onAvanzar });
  llamadas.current = { onSinObjetivo, onNavegar, onAvanzar };

  // 1) Ubica el elemento y lo lleva al centro de la pantalla.
  useEffect(() => {
    const ids = objetivos(paso);
    if (ids.length === 0) return;
    let intentos = 0;
    let temporizador: ReturnType<typeof setTimeout>;
    const buscar = () => {
      const elemento = buscarObjetivo(ids);
      if (elemento) {
        elemento.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: reducir ? 'auto' : 'smooth' });
        setObjetivo(elemento);
        return;
      }
      intentos += 1;
      if (intentos >= INTENTOS) {
        llamadas.current.onSinObjetivo();
        return;
      }
      temporizador = setTimeout(buscar, ESPERA_MS);
    };
    buscar();
    return () => clearTimeout(temporizador);
  }, [paso, reducir]);

  // 2) Sigue su posición con ResizeObserver, scroll y resize.
  useEffect(() => {
    if (!objetivo) return;
    let cuadro = 0;
    const medir = () => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => {
        if (!objetivo.isConnected) {
          llamadas.current.onSinObjetivo();
          return;
        }
        const r = objetivo.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        setVentana({ ancho: window.innerWidth, alto: window.innerHeight });
      });
    };
    medir();
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(medir);
    observador?.observe(objetivo);
    observador?.observe(document.body);
    window.addEventListener('scroll', medir, true);
    window.addEventListener('resize', medir);
    return () => {
      cancelAnimationFrame(cuadro);
      observador?.disconnect();
      window.removeEventListener('scroll', medir, true);
      window.removeEventListener('resize', medir);
    };
  }, [objetivo]);

  // 3) Condición del paso interactivo y clic del paso de navegación.
  useEffect(() => {
    if (!objetivo) return;
    const leer = (cambiado: boolean) =>
      setLectura((anterior) => ({ hayTexto: leerTexto(objetivo), cambiado: anterior.cambiado || cambiado }));
    const alCambiar = () => leer(true);
    const alPulsar = () => {
      if (paso.tipo === 'navegacion') llamadas.current.onNavegar();
    };
    leer(false);
    objetivo.addEventListener('input', alCambiar);
    objetivo.addEventListener('change', alCambiar);
    objetivo.addEventListener('click', alPulsar);
    return () => {
      objetivo.removeEventListener('input', alCambiar);
      objetivo.removeEventListener('change', alCambiar);
      objetivo.removeEventListener('click', alPulsar);
    };
  }, [objetivo, paso.tipo]);

  const condicionCumplida = cumpleCondicion(paso.condicion, lectura);
  useEffect(() => {
    if (condicionCumplida && paso.condicion?.avanzaSolo) llamadas.current.onAvanzar();
  }, [condicionCumplida, paso.condicion?.avanzaSolo]);

  const conObjetivo = paso.objetivo !== null;
  const hueco = conObjetivo && rect && ventana.ancho > 0 ? huecoDe(rect, ventana) : null;
  // En los pasos "info" el elemento se ve pero no se puede usar; en los demás, sí.
  const huecoAbierto = paso.tipo !== 'info';

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" data-guia-capa="">
      {hueco ? (
        <>
          <Bloque style={{ top: 0, left: 0, width: '100%', height: hueco.top }} />
          <Bloque style={{ top: hueco.top + hueco.height, left: 0, width: '100%', bottom: 0 }} />
          <Bloque style={{ top: hueco.top, left: 0, width: hueco.left, height: hueco.height }} />
          <Bloque style={{ top: hueco.top, left: hueco.left + hueco.width, right: 0, height: hueco.height }} />
          {huecoAbierto ? null : (
            <div aria-hidden="true" className="pointer-events-auto fixed" style={{ ...hueco }} />
          )}
          <motion.div
            aria-hidden="true"
            data-guia-anillo=""
            className="pointer-events-none fixed rounded-[12px] border-[3px] border-primario outline outline-2 outline-white"
            style={{ top: hueco.top, left: hueco.left, width: hueco.width, height: hueco.height }}
            {...(reducir
              ? {}
              : {
                  animate: { boxShadow: ['0 0 0 0 rgba(46,125,83,0.55)', '0 0 0 10px rgba(46,125,83,0)'] },
                  transition: { duration: 1.6, repeat: Infinity, ease: 'easeOut' },
                })}
          />
        </>
      ) : (
        <Bloque style={{ inset: 0 }} />
      )}
      {!conObjetivo || hueco ? children({ hueco, objetivo, condicionCumplida }) : null}
    </div>
  );
}
