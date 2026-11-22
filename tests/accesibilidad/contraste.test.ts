// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Contraste WCAG 2.2 AA (4,5:1 para texto normal) de cada par texto/fondo que usa la app. Todos los colores salen
// de las variables de src/app/globals.css: si se cambia la paleta, esta prueba dice qué par deja de cumplir.
const css = readFileSync(path.resolve(__dirname, '../../src/app/globals.css'), 'utf8');
const variable = (nombre: string): string => {
  const valor = new RegExp(`--${nombre}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1];
  if (!valor) throw new Error(`Falta la variable --${nombre} en globals.css`);
  return valor;
};

const C = {
  fondo: variable('color-fondo'),
  superficie: variable('color-superficie'),
  texto: variable('color-texto'),
  textoSuave: variable('color-texto-suave'),
  borde: variable('color-borde'),
  primario: variable('color-primario'),
  primarioFuerte: variable('color-primario-fuerte'),
  primarioSuave: variable('color-primario-suave'),
  lavanda: variable('color-lavanda'),
  acento: variable('color-acento'),
  subir: variable('color-subir'),
  mantener: variable('color-mantener'),
  descarga: variable('color-descarga'),
  calistenia: variable('color-calistenia'),
  peligro: variable('color-peligro'),
  peligroSuave: variable('color-peligro-suave'),
  aviso: variable('color-aviso'),
  avisoSuave: variable('color-aviso-suave'),
  exito: variable('color-exito'),
  exitoSuave: variable('color-exito-suave'),
  blanco: '#ffffff',
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

// El punto más intenso de los halos lavanda del fondo (.fondo-marca: lavanda al 30 % sobre --color-fondo).
const haloFondo = componer(C.lavanda, 0.3, C.fondo);

const PARES: [string, string, string][] = [
  ['texto sobre tarjeta', C.texto, C.superficie],
  ['texto sobre fondo', C.texto, C.fondo],
  ['texto sobre el halo lavanda del fondo', C.texto, haloFondo],
  ['texto sobre morado suave (siguiente paso, opciones elegidas)', C.texto, C.primarioSuave],
  ['texto suave sobre tarjeta', C.textoSuave, C.superficie],
  ['texto suave sobre fondo', C.textoSuave, C.fondo],
  ['texto suave sobre el halo lavanda del fondo', C.textoSuave, haloFondo],
  ['texto suave sobre morado suave', C.textoSuave, C.primarioSuave],
  ['marcador de posición (texto suave) sobre un campo', C.textoSuave, C.superficie],
  ['enlace morado sobre tarjeta', C.primario, C.superficie],
  ['enlace morado sobre fondo', C.primario, C.fondo],
  ['enlace morado sobre el halo lavanda del fondo', C.primario, haloFondo],
  ['enlace morado sobre morado suave ("Anótalos juntos en Entrenar hoy", "Más detalles")', C.primario, C.primarioSuave],
  ['botón principal y menú (blanco sobre morado)', C.blanco, C.primario],
  ['botón principal en hover o activo (blanco sobre morado fuerte)', C.blanco, C.primarioFuerte],
  ['botón suave (morado fuerte sobre morado suave)', C.primarioFuerte, C.primarioSuave],
  ['botón deshabilitado (texto suave sobre borde)', C.textoSuave, C.borde],
  ['insignia (texto sobre blanco)', C.texto, C.superficie],
  ['acento (récords, cumpleaños) sobre tarjeta', C.acento, C.superficie],
  ['acento sobre fondo', C.acento, C.fondo],
  ['subir (verde de progreso) sobre tarjeta', C.subir, C.superficie],
  ['subir sobre fondo', C.subir, C.fondo],
  ['descarga (ámbar) sobre tarjeta', C.descarga, C.superficie],
  ['descarga sobre fondo', C.descarga, C.fondo],
  ['blanco sobre gris de "Mantener"', C.blanco, C.mantener],
  ['calistenia sobre tarjeta', C.calistenia, C.superficie],
  ['peligro (errores) sobre tarjeta', C.peligro, C.superficie],
  ['peligro sobre fondo', C.peligro, C.fondo],
  ['peligro sobre su fondo suave (aviso de error)', C.peligro, C.peligroSuave],
  ['botón de peligro (blanco sobre peligro)', C.blanco, C.peligro],
  ['aviso sobre tarjeta', C.aviso, C.superficie],
  ['aviso sobre fondo', C.aviso, C.fondo],
  ['aviso sobre su fondo suave', C.aviso, C.avisoSuave],
  ['éxito sobre tarjeta', C.exito, C.superficie],
  ['éxito sobre fondo', C.exito, C.fondo],
  ['éxito sobre su fondo suave', C.exito, C.exitoSuave],
];

describe('contraste de los colores (WCAG 2.2 AA, 4,5:1)', () => {
  it('la fórmula da los valores de referencia', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contraste('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  it.each(PARES)('%s', (_nombre, frente, fondo) => {
    expect(contraste(frente, fondo)).toBeGreaterThanOrEqual(4.5);
  });

  it('el CSS global pone el foco visible con el color de la marca, marcadores legibles y movimiento reducido', () => {
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline: 2px solid var\(--color-primario\)/);
    expect(css).toMatch(/::placeholder\s*\{[^}]*color: var\(--color-texto-suave\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  it('el lavanda decorativo no sirve para texto (por eso nunca se usa como color de texto)', () => {
    expect(contraste(C.lavanda, C.superficie)).toBeLessThan(4.5);
  });
});

// ---------- Tema de vidrio del panel de administración ----------
// Los fondos translúcidos se componen sobre el tono MÁS OSCURO y el MÁS CLARO que puede quedar detrás (el
// degradado, con el toque cálido encima), y el texto debe cumplir 4,5:1 en los dos casos.
const alfa = (nombre: string): number => {
  const valor = new RegExp(`--${nombre}:\\s*([0-9.]+)`).exec(css)?.[1];
  if (!valor) throw new Error(`Falta la variable --${nombre} en globals.css`);
  return Number(valor);
};

function componer(frente: string, opacidad: number, fondo: string): string {
  const canal = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
  return `#${[1, 3, 5]
    .map((i) => Math.round(canal(frente, i) * opacidad + canal(fondo, i) * (1 - opacidad)).toString(16).padStart(2, '0'))
    .join('')}`;
}

const A = {
  oscuro: variable('admin-fondo-oscuro'),
  claro: variable('admin-fondo-claro'),
  calido: variable('admin-calido'),
  calidoAlfa: alfa('admin-calido-alfa'),
  lateral: variable('admin-lateral'),
  lateralAlfa: alfa('admin-lateral-alfa'),
  tarjeta: variable('admin-tarjeta'),
  tarjetaAlfa: alfa('admin-tarjeta-alfa'),
  textoClaro: variable('admin-texto-claro'),
  textoClaroSuave: variable('admin-texto-claro-suave'),
};
// El punto más claro del fondo: el tono claro del degradado con el toque cálido encima.
const fondoMasClaro = componer(A.calido, A.calidoAlfa, A.claro);
const fondos = [A.oscuro, fondoMasClaro];
const tarjetas = fondos.map((fondo) => componer(A.tarjeta, A.tarjetaAlfa, fondo));
const laterales = fondos.map((fondo) => componer(A.lateral, A.lateralAlfa, fondo));

const PARES_ADMIN: [string, string, string][] = [
  ...tarjetas.flatMap((t, i): [string, string, string][] => [
    [`texto en tarjeta de vidrio (fondo ${i})`, C.texto, t],
    [`texto suave en tarjeta de vidrio (fondo ${i})`, C.textoSuave, t],
    [`morado de la marca en tarjeta de vidrio (fondo ${i})`, C.primario, t],
  ]),
  ...fondos.flatMap((f, i): [string, string, string][] => [
    [`texto claro sobre el fondo del panel (${i})`, A.textoClaro, f],
    [`texto claro suave sobre el fondo del panel (${i})`, A.textoClaroSuave, f],
  ]),
  ...laterales.flatMap((l, i): [string, string, string][] => [
    [`menú lateral (${i})`, A.textoClaro, l],
    [`menú lateral, texto suave (${i})`, A.textoClaroSuave, l],
  ]),
  ['insignia que sube', variable('admin-sube-texto'), variable('admin-sube-fondo')],
  ['insignia que baja', variable('admin-baja-texto'), variable('admin-baja-fondo')],
  ['insignia sin cambio', variable('admin-igual-texto'), variable('admin-igual-fondo')],
  ['contador y avisos', variable('admin-aviso-texto'), variable('admin-aviso-fondo')],
];

describe('contraste del tema de vidrio del panel de administración', () => {
  it.each(PARES_ADMIN)('%s', (_nombre, frente, fondo) => {
    expect(contraste(frente, fondo)).toBeGreaterThanOrEqual(4.5);
  });

  it('el anillo de foco se ve sobre el fondo oscuro (3:1) y lleva un halo oscuro para las tarjetas claras', () => {
    expect(contraste(variable('admin-foco'), A.oscuro)).toBeGreaterThanOrEqual(3);
    expect(contraste(A.oscuro, tarjetas[1]!)).toBeGreaterThanOrEqual(3);
    expect(css).toMatch(/\.tema-admin :focus-visible\s*\{[^}]*outline: 3px solid var\(--admin-foco\)[^}]*box-shadow/);
  });
});
