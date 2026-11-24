'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ALTO_CIELO, ANCHO_CIELO } from '@/lib/constelaciones';
import type { EstadoConstelacion } from '@/lib/reglas/constelacion';

// El cielo del inicio: un solo <canvas> 2D, fijo por debajo de todo el contenido (#cielo-gym en el layout de
// /gym) y decorativo (aria-hidden). Se dibuja con requestAnimationFrame sin re-renderizar React, con
// devicePixelRatio hasta 2, y se pausa con la pestaña oculta. Con movimiento reducido: una imagen fija del estado
// actual, sin titileo, sin estrella fugaz ni destellos. Las reacciones al cursor solo con puntero fino.
export const CLAVE_CONSTELACION_VISTA = 'agon_constelacion_vista';
const RADIO_CERCANIA = 120;
const PARALLAX_MAXIMO = 15;
const DURACION_DESTELLO = 1300;
const ESTRELLAS_FONDO = 80;
const SEMILLA = 20261122;

// Generador con semilla (mulberry32): las estrellas de fondo quedan siempre en el mismo lugar.
function generador(semilla: number) {
  let a = semilla;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const azar = generador(SEMILLA);
const FONDO = Array.from({ length: ESTRELLAS_FONDO }, () => ({
  x: azar(),
  y: azar(),
  r: 0.4 + azar() * 0.9,
  alfa: 0.25 + azar() * 0.4,
  fase: azar() * Math.PI * 2,
}));

// Qué estrella se enciende con destello: la nueva desde la última visita al inicio (localStorage, "semana:n").
export function estrellaNueva(guardado: string | null, semana: string, encendidas: number): number | null {
  if (encendidas === 0) return null;
  const [semanaVista, vistas] = (guardado ?? '').split(':');
  const anteriores = semanaVista === semana ? Number(vistas) || 0 : 0;
  return anteriores < encendidas ? encendidas - 1 : null;
}

function leerColores() {
  const estilo = getComputedStyle(document.documentElement);
  const color = (nombre: string) => estilo.getPropertyValue(nombre).trim();
  return {
    apagada: color('--cielo-apagada'),
    nucleo: color('--cielo-nucleo'),
    halo: color('--cielo-halo'),
    linea: color('--cielo-linea'),
    lineaApagada: color('--cielo-linea-apagada'),
    fondo: color('--cielo-fondo-estrella'),
    fuente: getComputedStyle(document.body).fontFamily,
  };
}

function Lienzo({ estado }: { estado: EstadoConstelacion }) {
  const lienzo = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = lienzo.current;
    const ctx = canvas?.getContext('2d') ?? null;
    if (!canvas || !ctx) return undefined;

    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const fino = window.matchMedia?.('(pointer: fine)').matches ?? false;
    const colores = leerColores();
    const { constelacion, encendidas, lineasEncendidas, estrellaFugaz } = estado;

    let guardado: string | null = null;
    try {
      guardado = window.localStorage.getItem(CLAVE_CONSTELACION_VISTA);
      window.localStorage.setItem(CLAVE_CONSTELACION_VISTA, `${estado.semana}:${encendidas}`);
    } catch {
      // Sin almacenamiento: sin destello de estrella nueva.
    }
    const nueva = reducido ? null : estrellaNueva(guardado, estado.semana, encendidas);
    const completaNueva = nueva !== null && estado.completa;

    let ancho = 0;
    let alto = 0;
    let escala = 1;
    let origenX = 0;
    let origenY = 0;
    const raton = { x: -9999, y: -9999, nx: 0, ny: 0 };

    const medir = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      ancho = window.innerWidth;
      alto = window.innerHeight;
      canvas.width = Math.round(ancho * dpr);
      canvas.height = Math.round(alto * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // La figura conserva su proporción y va en la franja despejada del inicio (.franja-cielo, en /gym): en
      // escritorio y en móvil, entre el saludo y las tarjetas, completa y sin tarjetas encima.
      const escritorio = ancho >= 1024;
      escala = escritorio
        ? Math.min((ancho * 0.4) / ANCHO_CIELO, (alto * 0.3) / ALTO_CIELO)
        : Math.min((ancho * 0.78) / ANCHO_CIELO, (alto * 0.27) / ALTO_CIELO);
      const centroX = escritorio ? ancho * 0.55 : ancho / 2;
      const centroY = alto * (escritorio ? 0.42 : 0.41);
      origenX = centroX - (ANCHO_CIELO / 2) * escala;
      origenY = centroY - (ALTO_CIELO / 2) * escala;
    };

    const posicion = ([x, y]: readonly [number, number], dx: number, dy: number) => ({
      x: origenX + x * escala + dx,
      y: origenY + y * escala + dy,
    });
    const cerca = (x: number, y: number) => {
      if (!fino) return 0;
      const distancia = Math.hypot(raton.x - x, raton.y - y);
      return distancia < RADIO_CERCANIA ? 1 - distancia / RADIO_CERCANIA : 0;
    };

    let inicio = performance.now();
    const dibujar = (ahora: number) => {
      const t = reducido ? Number.POSITIVE_INFINITY : ahora - inicio;
      const animar = !reducido;
      ctx.clearRect(0, 0, ancho, alto);

      // Parallax (cursor y scroll), como mucho 15 px; en móvil, una deriva muy lenta.
      let dx = 0;
      let dy = 0;
      if (animar && fino) {
        dx = raton.nx * 8;
        dy = raton.ny * 8 - Math.min(window.scrollY * 0.03, 7);
      } else if (animar) {
        dx = Math.sin(ahora / 9000) * 4;
        dy = Math.cos(ahora / 11000) * 3;
      }
      const magnitud = Math.hypot(dx, dy);
      if (magnitud > PARALLAX_MAXIMO) {
        dx = (dx / magnitud) * PARALLAX_MAXIMO;
        dy = (dy / magnitud) * PARALLAX_MAXIMO;
      }

      // Estrellas de fondo (la mitad de parallax: están más lejos).
      ctx.fillStyle = colores.fondo;
      for (const estrella of FONDO) {
        const x = estrella.x * ancho + dx * 0.5;
        const y = estrella.y * alto + dy * 0.5;
        const titileo = animar ? 0.75 + 0.25 * Math.sin(ahora / 1600 + estrella.fase) : 1;
        ctx.globalAlpha = Math.min(1, estrella.alfa * titileo + cerca(x, y) * 0.5);
        ctx.beginPath();
        ctx.arc(x, y, estrella.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const puntos = constelacion.estrellas.map((estrella) => posicion(estrella, dx, dy));

      // Líneas: apagadas punteadas; encendidas, sólidas. La de la estrella nueva se dibuja (dashoffset).
      constelacion.lineas.forEach(([a, b], indice) => {
        const p = puntos[a]!;
        const q = puntos[b]!;
        const largo = Math.hypot(q.x - p.x, q.y - p.y);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        if (lineasEncendidas[indice]) {
          const esNueva = nueva !== null && Math.max(a, b) === nueva;
          const avance = esNueva ? Math.min(1, Math.max(0, (t - 350) / 700)) : 1;
          ctx.globalAlpha = 0.85;
          ctx.strokeStyle = colores.linea;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([largo, largo]);
          ctx.lineDashOffset = largo * (1 - avance);
        } else {
          ctx.globalAlpha = 0.9;
          ctx.strokeStyle = colores.lineaApagada;
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 4]);
          ctx.lineDashOffset = 0;
        }
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Estrellas de la figura.
      puntos.forEach((punto, indice) => {
        const proximidad = cerca(punto.x, punto.y);
        if (indice >= encendidas) {
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = colores.apagada;
          ctx.beginPath();
          ctx.arc(punto.x, punto.y, 1.8 + proximidad, 0, Math.PI * 2);
          ctx.fill();
          return;
        }
        const titileo = animar ? 0.88 + 0.12 * Math.sin(ahora / 1300 + indice * 1.7) : 1;
        // Halo (--cielo-halo al 22 %, más intenso cerca del cursor) y núcleo.
        const radioHalo = 11 * (1 + proximidad * 0.5);
        const halo = ctx.createRadialGradient(punto.x, punto.y, 0, punto.x, punto.y, radioHalo);
        halo.addColorStop(0, colores.halo);
        halo.addColorStop(1, 'transparent');
        ctx.globalAlpha = Math.min(1, 0.22 * titileo + proximidad * 0.2);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(punto.x, punto.y, radioHalo, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = titileo;
        ctx.fillStyle = colores.nucleo;
        ctx.beginPath();
        ctx.arc(punto.x, punto.y, 2.6 + proximidad * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // El destello de la estrella nueva: un anillo que crece y se apaga.
        if (indice === nueva && t < DURACION_DESTELLO) {
          const avance = t / DURACION_DESTELLO;
          ctx.globalAlpha = (1 - avance) * 0.8;
          ctx.strokeStyle = colores.nucleo;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(punto.x, punto.y, 4 + avance * 26, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // La Estrella Polar: dos anillos de luz al encenderse.
      if (constelacion.anillos && encendidas > 0) {
        const centro = puntos[0]!;
        constelacion.anillos.forEach((radio, indice) => {
          const avance = nueva === 0 ? Math.min(1, Math.max(0, (t - 200 - indice * 250) / 700)) : 1;
          ctx.globalAlpha = (indice === 0 ? 0.35 : 0.2) * avance;
          ctx.strokeStyle = colores.linea;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(centro.x, centro.y, radio * escala * (0.6 + 0.4 * avance), 0, Math.PI * 2);
          ctx.stroke();
        });
      }

      // Al completar la semana: un destello sobre toda la figura.
      if (completaNueva && t < DURACION_DESTELLO * 1.4) {
        const avance = t / (DURACION_DESTELLO * 1.4);
        const centroX = origenX + (ANCHO_CIELO / 2) * escala + dx;
        const centroY = origenY + (ALTO_CIELO / 2) * escala + dy;
        const radio = (ANCHO_CIELO / 2) * escala * (0.6 + avance);
        const brillo = ctx.createRadialGradient(centroX, centroY, 0, centroX, centroY, radio);
        brillo.addColorStop(0, colores.halo);
        brillo.addColorStop(1, 'transparent');
        ctx.globalAlpha = 0.3 * Math.sin(avance * Math.PI);
        ctx.fillStyle = brillo;
        ctx.fillRect(centroX - radio, centroY - radio, radio * 2, radio * 2);
      }

      // Estrella fugaz (día entrenado no planificado): una estela que cruza una vez al cargar.
      if (estrellaFugaz && animar && t > 900 && t < 2100) {
        const avance = (t - 900) / 1200;
        const x = ancho * (0.12 + avance * 0.6);
        const y = alto * (0.1 + avance * 0.32);
        const cola = ctx.createLinearGradient(x, y, x - 130, y - 70);
        cola.addColorStop(0, colores.nucleo);
        cola.addColorStop(1, 'transparent');
        ctx.globalAlpha = Math.sin(avance * Math.PI);
        ctx.strokeStyle = cola;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 130, y - 70);
        ctx.stroke();
      }

      // Al pasar el cursor sobre la figura, su nombre junto a la primera estrella.
      if (fino && animar) {
        const xs = puntos.map((p) => p.x);
        const ys = puntos.map((p) => p.y);
        const margen = 40;
        if (
          raton.x > Math.min(...xs) - margen &&
          raton.x < Math.max(...xs) + margen &&
          raton.y > Math.min(...ys) - margen &&
          raton.y < Math.max(...ys) + margen
        ) {
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = colores.nucleo;
          ctx.font = `600 14px ${colores.fuente}`;
          ctx.fillText(constelacion.nombre, puntos[0]!.x + 12, puntos[0]!.y - 12);
        }
      }
      ctx.globalAlpha = 1;
    };

    let cuadro = 0;
    const bucle = (ahora: number) => {
      dibujar(ahora);
      cuadro = requestAnimationFrame(bucle);
    };
    const arrancar = () => {
      if (reducido || cuadro || document.hidden) return;
      cuadro = requestAnimationFrame(bucle);
    };
    const parar = () => {
      cancelAnimationFrame(cuadro);
      cuadro = 0;
    };

    medir();
    dibujar(performance.now());
    arrancar();

    const alRedimensionar = () => {
      medir();
      if (reducido) dibujar(performance.now());
    };
    const alMover = (evento: PointerEvent) => {
      raton.x = evento.clientX;
      raton.y = evento.clientY;
      raton.nx = (evento.clientX / ancho - 0.5) * 2;
      raton.ny = (evento.clientY / alto - 0.5) * 2;
    };
    const alCambiarVisibilidad = () => (document.hidden ? parar() : arrancar());
    window.addEventListener('resize', alRedimensionar);
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    if (fino && !reducido) window.addEventListener('pointermove', alMover, { passive: true });
    inicio = performance.now();

    return () => {
      parar();
      window.removeEventListener('resize', alRedimensionar);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      window.removeEventListener('pointermove', alMover);
    };
  }, [estado]);

  return <canvas ref={lienzo} />;
}

export function CieloConstelacion({ estado }: { estado: EstadoConstelacion }) {
  // Se monta en #cielo-gym (layout de /gym): la plantilla de la página anima con transform, y un ancestro con
  // transform dejaría de anclar el canvas a la ventana.
  const [destino, setDestino] = useState<HTMLElement | null>(null);
  useEffect(() => setDestino(document.getElementById('cielo-gym')), []);
  if (!destino) return null;
  return createPortal(
    <div className="cielo-gym" aria-hidden="true" data-testid="cielo-constelacion">
      <Lienzo estado={estado} />
    </div>,
    destino,
  );
}
