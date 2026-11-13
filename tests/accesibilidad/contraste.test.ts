// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Contraste WCAG 2.2 AA (4,5:1 para texto normal) de cada par de colores que la app usa para texto. Los colores
// de la marca salen de las variables de globals.css; los de Tailwind que se usan como texto están aquí.
const css = readFileSync(path.resolve(__dirname, '../../src/app/globals.css'), 'utf8');
const variable = (nombre: string): string => {
  const valor = new RegExp(`--${nombre}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1];
  if (!valor) throw new Error(`Falta la variable --${nombre} en globals.css`);
  return valor;
};

const C = {
  primario: variable('color-primario'),
  primarioSuave: variable('color-primario-suave'),
  fondo: variable('color-fondo'),
  superficie: variable('color-superficie'),
  texto: variable('color-texto'),
  textoSuave: variable('color-texto-suave'),
  borde: variable('color-borde'),
  mantener: variable('color-mantener'),
  blanco: '#ffffff',
  rojo700: '#b91c1c', // errores de los campos
  rojo600: '#dc2626', // errores de SelectorDias y del registro
  esmeralda700: '#047857',
  esmeralda800: '#065f46',
  esmeralda50: '#ecfdf5',
  pizarra200: '#e2e8f0',
  pizarra500: '#64748b', // marcadores de posición (::placeholder)
  pizarra600: '#475569',
  pizarra700: '#334155',
  pizarra900: '#0f172a',
  fondoPublico: '#eefaf1', // el tono más oscuro del degradado de las páginas públicas
};

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const canal = parseInt(hex.slice(i, i + 2), 16) / 255;
    return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro! + 0.05) / (oscuro! + 0.05);
}

const PARES: [string, string, string][] = [
  ['texto sobre tarjeta', C.texto, C.superficie],
  ['texto sobre fondo', C.texto, C.fondo],
  ['texto sobre verde suave (siguiente paso, opciones elegidas)', C.texto, C.primarioSuave],
  ['texto suave sobre tarjeta', C.textoSuave, C.superficie],
  ['texto suave sobre fondo', C.textoSuave, C.fondo],
  ['texto suave sobre verde suave', C.textoSuave, C.primarioSuave],
  ['enlace verde sobre tarjeta', C.primario, C.superficie],
  ['enlace verde sobre fondo', C.primario, C.fondo],
  ['enlace verde sobre verde suave ("Anótalos juntos en Entrenar hoy", "Más detalles")', C.primario, C.primarioSuave],
  ['botón principal y menú (blanco sobre verde)', C.blanco, C.primario],
  ['botón deshabilitado (texto suave sobre gris)', C.textoSuave, C.borde],
  ['insignia (texto sobre blanco)', C.texto, C.superficie],
  ['error de un campo', C.rojo700, C.superficie],
  ['error del selector de días', C.rojo600, C.superficie],
  ['marcador de posición', C.pizarra500, C.superficie],
  ['ayuda del registro', C.pizarra600, C.superficie],
  ['ayuda del registro sobre el fondo público', C.pizarra600, C.fondoPublico],
  ['marca "Gym Assistant" de las páginas públicas', C.esmeralda700, C.superficie],
  ['accesos rápidos de días', C.esmeralda800, C.esmeralda50],
  ['botón deshabilitado de las páginas públicas', C.pizarra700, C.pizarra200],
  ['texto de las páginas públicas', C.pizarra900, C.fondoPublico],
  ['blanco sobre gris de "Mantener"', C.blanco, C.mantener],
];

describe('contraste de los colores (WCAG 2.2 AA, 4,5:1)', () => {
  it('la fórmula da los valores de referencia', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contraste('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  it.each(PARES)('%s', (_nombre, frente, fondo) => {
    expect(contraste(frente, fondo)).toBeGreaterThanOrEqual(4.5);
  });

  it('el CSS global pone el foco visible, marcadores legibles y respeta el movimiento reducido', () => {
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline: 2px solid/);
    expect(css).toMatch(/::placeholder\s*\{[^}]*color: #64748b/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});
