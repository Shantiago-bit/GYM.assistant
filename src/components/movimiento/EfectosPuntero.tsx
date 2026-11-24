'use client';

import { useEffect } from 'react';
import { useNivelMovimiento } from '@/components/ui/ProveedorMovimiento';

const INCLINACION_MAXIMA = 6; // grados
const ATRACCION_MAXIMA = 6; // px de los botones magnéticos
const RADIO_MAGNETICO = 48; // px alrededor del botón

// Con puntero fino (mouse o trackpad) y el nivel "Completas": las tarjetas con data-inclinar se inclinan hacia el
// cursor (máx. 6°) con un brillo que lo sigue, y los botones con data-magnetico se acercan unos px. Con pantalla
// táctil y "Completas": una onda morada desde el punto del toque en botones, enlaces y tarjetas.
// Todo por delegación de eventos, con requestAnimationFrame y variables CSS: React no se vuelve a pintar.
export function EfectosPuntero() {
  const { nivel } = useNivelMovimiento();

  useEffect(() => {
    if (nivel !== 'completas') return undefined;
    const fino = window.matchMedia?.('(pointer: fine)').matches ?? false;
    let cuadro = 0;
    let ultimo: PointerEvent | null = null;
    let inclinada: HTMLElement | null = null;
    const atraidos = new Set<HTMLElement>();

    const soltar = (tarjeta: HTMLElement) => {
      delete tarjeta.dataset.inclinando;
      tarjeta.style.removeProperty('--rx');
      tarjeta.style.removeProperty('--ry');
      tarjeta.style.setProperty('--brillo', '0');
    };

    const pintar = () => {
      cuadro = 0;
      const evento = ultimo;
      if (!evento) return;
      const objetivo = evento.target instanceof Element ? evento.target : null;
      const tarjeta = objetivo?.closest<HTMLElement>('[data-inclinar]') ?? null;
      if (inclinada && inclinada !== tarjeta) soltar(inclinada);
      inclinada = tarjeta;
      if (tarjeta) {
        const caja = tarjeta.getBoundingClientRect();
        const x = evento.clientX - caja.left;
        const y = evento.clientY - caja.top;
        const nx = x / caja.width - 0.5;
        const ny = y / caja.height - 0.5;
        tarjeta.dataset.inclinando = '';
        tarjeta.style.setProperty('--rx', `${(-ny * INCLINACION_MAXIMA * 2).toFixed(2)}deg`);
        tarjeta.style.setProperty('--ry', `${(nx * INCLINACION_MAXIMA * 2).toFixed(2)}deg`);
        tarjeta.style.setProperty('--x', `${x.toFixed(0)}px`);
        tarjeta.style.setProperty('--y', `${y.toFixed(0)}px`);
        tarjeta.style.setProperty('--brillo', '1');
      }
      for (const boton of document.querySelectorAll<HTMLElement>('[data-magnetico]')) {
        const caja = boton.getBoundingClientRect();
        const cx = caja.left + caja.width / 2;
        const cy = caja.top + caja.height / 2;
        const cerca =
          evento.clientX > caja.left - RADIO_MAGNETICO &&
          evento.clientX < caja.right + RADIO_MAGNETICO &&
          evento.clientY > caja.top - RADIO_MAGNETICO &&
          evento.clientY < caja.bottom + RADIO_MAGNETICO;
        if (cerca) {
          const dx = Math.max(-1, Math.min(1, (evento.clientX - cx) / (caja.width / 2 + RADIO_MAGNETICO)));
          const dy = Math.max(-1, Math.min(1, (evento.clientY - cy) / (caja.height / 2 + RADIO_MAGNETICO)));
          boton.style.setProperty('--mx', `${(dx * ATRACCION_MAXIMA).toFixed(1)}px`);
          boton.style.setProperty('--my', `${(dy * ATRACCION_MAXIMA).toFixed(1)}px`);
          boton.dataset.atraido = '';
          atraidos.add(boton);
        } else if (atraidos.has(boton)) {
          boton.style.removeProperty('--mx');
          boton.style.removeProperty('--my');
          delete boton.dataset.atraido;
          atraidos.delete(boton);
        }
      }
    };

    const alMover = (evento: PointerEvent) => {
      if (evento.pointerType !== 'mouse' && evento.pointerType !== 'pen') return;
      ultimo = evento;
      if (!cuadro) cuadro = requestAnimationFrame(pintar);
    };
    const alSalir = () => {
      if (inclinada) soltar(inclinada);
      inclinada = null;
    };

    // Onda morada desde el punto del toque, recortada a la forma del elemento (no lo modifica).
    const alTocar = (evento: PointerEvent) => {
      if (evento.pointerType !== 'touch') return;
      const objetivo = evento.target instanceof Element ? evento.target : null;
      const elemento = objetivo?.closest<HTMLElement>('button, a[href], [data-inclinar], [role="button"]');
      if (!elemento || elemento.matches(':disabled')) return;
      const caja = elemento.getBoundingClientRect();
      const capa = document.createElement('span');
      capa.className = 'onda-toque';
      capa.setAttribute('aria-hidden', 'true');
      Object.assign(capa.style, {
        left: `${caja.left}px`,
        top: `${caja.top}px`,
        width: `${caja.width}px`,
        height: `${caja.height}px`,
        borderRadius: getComputedStyle(elemento).borderRadius,
      });
      const circulo = document.createElement('span');
      const lado = Math.max(caja.width, caja.height) * 2;
      Object.assign(circulo.style, {
        left: `${evento.clientX - caja.left - lado / 2}px`,
        top: `${evento.clientY - caja.top - lado / 2}px`,
        width: `${lado}px`,
        height: `${lado}px`,
      });
      capa.appendChild(circulo);
      document.body.appendChild(capa);
      setTimeout(() => capa.remove(), 600);
    };

    if (fino) {
      document.addEventListener('pointermove', alMover, { passive: true });
      document.addEventListener('pointerleave', alSalir);
    }
    document.addEventListener('pointerdown', alTocar, { passive: true });
    return () => {
      cancelAnimationFrame(cuadro);
      document.removeEventListener('pointermove', alMover);
      document.removeEventListener('pointerleave', alSalir);
      document.removeEventListener('pointerdown', alTocar);
      if (inclinada) soltar(inclinada);
      for (const boton of atraidos) {
        boton.style.removeProperty('--mx');
        boton.style.removeProperty('--my');
        delete boton.dataset.atraido;
      }
    };
  }, [nivel]);

  return null;
}
