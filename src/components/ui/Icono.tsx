// Íconos de la app en SVG en línea, sin dependencias. Todos son de trazo, de 24 × 24, toman el color del texto
// (currentColor) y son decorativos: el nombre accesible lo da el texto o el aria-label del control que los usa.

const TRAZOS = {
  // Menú.
  mancuerna: 'M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12',
  cronometro: 'M12 8v5l3 2M9 2h6M12 4a9 9 0 1 0 0 18a9 9 0 0 0 0-18',
  grafico: 'M3 20h18M5 16l5-5 4 3 6-7M15 7h5v5',
  conversacion: 'M4 5h16v11H9l-5 4z',
  // Navegación y controles.
  flechaIzquierda: 'M19 12H5M11 18l-6-6 6-6',
  flechaDerecha: 'M5 12h14M13 6l6 6-6 6',
  flechaArriba: 'M12 19V5M6 11l6-6 6 6',
  flechaAbajo: 'M12 5v14M6 13l6 6 6-6',
  cerrar: 'M18 6L6 18M6 6l12 12',
  chevronAbajo: 'M6 9l6 6 6-6',
  chevronDerecha: 'M9 6l6 6-6 6',
  pregunta: 'M9.2 9.2a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.6-2.8 2.6M12 17h.01',
  // Estados.
  check: 'M20 6L9 17l-5-5',
  checkCirculo: 'M12 22a10 10 0 1 0 0-20a10 10 0 0 0 0 20zM8 12.5l2.7 2.7L16 9.8',
  relojArena: 'M6 2h12M6 22h12M7 2v3.5a5 5 0 0 0 2 4L12 12l3-2.5a5 5 0 0 0 2-4V2M7 22v-3.5a5 5 0 0 1 2-4L12 12l3 2.5a5 5 0 0 1 2 4V22',
  // Récords.
  trofeo: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3',
  // Cumpleaños.
  pastel: 'M4 21v-8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8M4 16c1.3 0 1.3 1 2.7 1s1.3-1 2.6-1 1.4 1 2.7 1 1.4-1 2.7-1 1.3 1 2.6 1 1.4-1 2.7-1M2 21h20M8 11V8M12 11V8M16 11V8M8 5.5v-.01M12 5.5v-.01M16 5.5v-.01',
  celebracion: 'M4 20l4.5-11 6.5 6.5zM14 3l-.5 2M19 4l-2 2M21 9l-2 .5M16 10c1.5-1.5 3-1.5 4-1M12 6c.5 1.5.3 2.7-.8 3.8',
} as const;

export type NombreIcono = keyof typeof TRAZOS;

// grosor: el trazo; el menú usa 1,75 para que los íconos se vean más livianos junto al texto.
export function Icono({
  nombre,
  className = 'h-5 w-5',
  grosor = 2,
}: {
  nombre: NombreIcono;
  className?: string;
  grosor?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}
