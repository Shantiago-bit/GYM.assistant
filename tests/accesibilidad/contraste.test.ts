// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Contraste WCAG 2.2 AA de cada par que usa la app: 4,5:1 para texto normal; 3:1 para contornos de controles y
// elementos gráficos. Todos los colores salen de las variables de src/app/globals.css: si se cambia la paleta, esta
// prueba dice qué par deja de cumplir.
const css = readFileSync(path.resolve(__dirname, '../../src/app/globals.css'), 'utf8');
const variable = (nombre: string): string => {
  const valor = new RegExp(`--${nombre}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1];
  if (!valor) throw new Error(`Falta la variable --${nombre} en globals.css`);
  return valor;
};

const C = {
  fondo: variable('color-fondo'),
  superficie: variable('color-superficie'),
  elevada: variable('color-elevada'),
  campo: variable('color-campo'),
  texto: variable('color-texto'),
  textoSuave: variable('color-texto-suave'),
  borde: variable('color-borde'),
  bordeCampo: variable('color-borde-campo'),
  placeholder: variable('color-placeholder'),
  primario: variable('color-primario'),
  primarioFuerte: variable('color-primario-fuerte'),
  primarioSuave: variable('color-primario-suave'),
  enlace: variable('color-enlace'),
  lavanda: variable('color-lavanda'),
  acento: variable('color-acento'),
  subir: variable('color-subir'),
  mantener: variable('color-mantener'),
  descarga: variable('color-descarga'),
  peso: variable('color-peso'),
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

function componer(frente: string, opacidad: number, fondo: string): string {
  const canal = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
  return `#${[1, 3, 5]
    .map((i) => Math.round(canal(frente, i) * opacidad + canal(fondo, i) * (1 - opacidad)).toString(16).padStart(2, '0'))
    .join('')}`;
}

// El punto más intenso de los halos del fondo (body y .fondo-marca: #4a2d96 al 25 % sobre --color-fondo).
const haloFondo = componer('#4a2d96', 0.25, C.fondo);
// Las insignias con fondo: el color al 16 % sobre la tarjeta y el texto en el color pleno.
const insignia = (color: string) => componer(color, 0.16, C.superficie);

// Los fondos sobre los que va texto en la app oscura.
const FONDOS: [string, string][] = [
  ['fondo', C.fondo],
  ['tarjeta', C.superficie],
  ['elevada (modales y menús)', C.elevada],
  ['morado suave (chips y destacados)', C.primarioSuave],
  ['halo del fondo', haloFondo],
];

const COLORES_CON_SIGNIFICADO = ['subir', 'mantener', 'descarga', 'calistenia', 'acento', 'peligro', 'aviso', 'exito', 'peso'] as const;

const PARES: [string, string, string][] = [
  ...FONDOS.flatMap(([nombre, fondo]): [string, string, string][] => [
    [`texto sobre ${nombre}`, C.texto, fondo],
    [`texto suave sobre ${nombre}`, C.textoSuave, fondo],
    [`enlace y texto de acento ("text-primario") sobre ${nombre}`, C.enlace, fondo],
  ]),
  ...COLORES_CON_SIGNIFICADO.flatMap((color): [string, string, string][] => [
    [`${color} sobre tarjeta`, C[color], C.superficie],
    [`${color} sobre fondo`, C[color], C.fondo],
    [`insignia ${color} (16 % de fondo, texto pleno)`, C[color], insignia(C[color])],
  ]),
  ['texto en un campo de formulario', C.texto, C.campo],
  ['marcador de posición en un campo', C.placeholder, C.campo],
  ['botón principal y menú (blanco sobre morado)', C.blanco, C.primario],
  ['botón principal en hover o activo (blanco sobre morado fuerte)', C.blanco, C.primarioFuerte],
  ['botón suave (texto claro sobre morado suave)', C.texto, C.primarioSuave],
  ['botón deshabilitado (texto suave sobre borde)', C.textoSuave, C.borde],
  ['botón de peligro (texto oscuro sobre peligro)', C.fondo, C.peligro],
  ['insignia "Nuevo" (texto oscuro sobre acento)', C.fondo, C.acento],
  ['inicial del ejercicio (texto oscuro sobre peso)', C.fondo, C.peso],
  ['inicial del ejercicio (texto oscuro sobre calistenia)', C.fondo, C.calistenia],
  ['peligro sobre su fondo suave (aviso de error)', C.peligro, C.peligroSuave],
  ['aviso sobre su fondo suave', C.aviso, C.avisoSuave],
  ['éxito sobre su fondo suave', C.exito, C.exitoSuave],
];

// El cielo del inicio: el texto que va directo sobre él lleva un velo (.velo-cielo, --color-fondo al
// --velo-cielo-alfa). El peor caso es una estrella encendida justo detrás (su núcleo, el color más claro del cielo).
const veloAlfa = Number(/--velo-cielo-alfa:\s*([0-9.]+)/.exec(css)?.[1]);
const veloSobreEstrella = componer(C.fondo, veloAlfa, variable('cielo-nucleo'));
const veloSobreHalo = componer(C.fondo, veloAlfa, componer(variable('cielo-halo'), 0.42, C.fondo));
// El destino activo del Pórtico: el fondo de la baldosa en su punto más claro (#4a2d96).
const baldosaClara = /--marca-baldosa:[^;]*?(#[0-9a-fA-F]{6})/.exec(css)?.[1] ?? '';

PARES.push(
  ['texto sobre el velo del cielo, con una estrella detrás', C.texto, veloSobreEstrella],
  ['texto suave sobre el velo del cielo, con una estrella detrás', C.textoSuave, veloSobreEstrella],
  ['enlace sobre el velo del cielo, con una estrella detrás', C.enlace, veloSobreEstrella],
  ['texto suave sobre el velo del cielo, con un halo detrás', C.textoSuave, veloSobreHalo],
  ['texto del destino activo del Pórtico (baldosa, punto más claro)', C.texto, baldosaClara],
  ['descripción del destino activo del Pórtico (baldosa, punto más claro)', C.textoSuave, baldosaClara],
);

// Contornos de los controles y elementos gráficos: 3:1 (WCAG 1.4.11).
const PARES_GRAFICOS: [string, string, string][] = [
  ['contorno de un campo sobre la tarjeta', C.bordeCampo, C.superficie],
  ['contorno de un campo sobre el fondo', C.bordeCampo, C.fondo],
  ['contorno de un campo sobre su propio fondo', C.bordeCampo, C.campo],
  ['contorno del compositor del chat sobre su fondo (superficie)', C.bordeCampo, C.superficie],
  ['anillo de foco (lavanda) sobre el fondo', C.lavanda, C.fondo],
  ['anillo de foco sobre la tarjeta', C.lavanda, C.superficie],
  ['anillo de foco sobre un campo', C.lavanda, C.campo],
  ['líneas de los gráficos (lavanda) sobre la tarjeta', C.lavanda, C.superficie],
  ['borde de estado (lavanda) sobre la tarjeta', C.lavanda, C.superficie],
];

describe('contraste de los colores (WCAG 2.2 AA)', () => {
  it('la fórmula da los valores de referencia', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contraste('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  it.each(PARES)('%s (4,5:1)', (_nombre, frente, fondo) => {
    expect(contraste(frente, fondo)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(PARES_GRAFICOS)('%s (3:1)', (_nombre, frente, fondo) => {
    expect(contraste(frente, fondo)).toBeGreaterThanOrEqual(3);
  });

  it('el morado de los botones NO sirve como texto sobre el fondo oscuro (por eso "text-primario" pinta el enlace)', () => {
    expect(contraste(C.primario, C.superficie)).toBeLessThan(4.5);
    const config = readFileSync(path.resolve(__dirname, '../../tailwind.config.ts'), 'utf8');
    expect(config).toMatch(/textColor:\s*\{\s*primario:\s*\{\s*DEFAULT: variable\('enlace'\)/);
  });

  it('el CSS global: tema oscuro, foco lavanda, marcadores legibles, campos distinguibles y movimiento reducido', () => {
    expect(css).toMatch(/:root\s*\{[^}]*color-scheme: dark/);
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline: 2px solid var\(--color-lavanda\)/);
    expect(css).toMatch(/::placeholder\s*\{[^}]*color: var\(--color-placeholder\)/);
    expect(css).toMatch(/textarea\s*\{[^}]*background-color: var\(--color-campo\);[^}]*border-color: var\(--color-borde-campo\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});

// ---------- Superficies translúcidas que dejan ver el cielo (Pórtico y tarjetas del inicio) ----------
// Peor caso: una estrella encendida justo detrás (sin contar el desenfoque, que solo la atenúa).
describe('superficies translúcidas sobre el cielo (peor caso: una estrella encendida detrás)', () => {
  const alfaDe = (nombre: string): number => {
    const valor = new RegExp(`--${nombre}:\\s*([0-9.]+)`).exec(css)?.[1];
    if (!valor) throw new Error(`Falta la variable --${nombre} en globals.css`);
    return Number(valor);
  };
  const estrella = variable('estrella-encendida');
  const portico = componer(C.fondo, alfaDe('portico-alfa'), estrella);
  const porticoCompacto = componer(C.fondo, alfaDe('portico-alfa-compacto'), estrella);
  const tarjeta = componer(C.superficie, alfaDe('tarjeta-translucida-alfa'), estrella);
  const boton = componer(variable('boton-translucido'), alfaDe('boton-translucido-alfa'), estrella);

  it.each([
    ['texto del Pórtico', C.texto, portico],
    ['descripción del Pórtico (texto suave)', C.textoSuave, portico],
    ['destino activo del Pórtico (enlace)', C.enlace, portico],
    ['Pórtico compacto, texto suave', C.textoSuave, porticoCompacto],
    ['texto en una tarjeta del inicio', C.texto, tarjeta],
    ['texto suave en una tarjeta del inicio', C.textoSuave, tarjeta],
    ['enlace en una tarjeta del inicio', C.enlace, tarjeta],
    ['texto de un botón secundario del inicio', C.texto, boton],
  ])('%s (4,5:1)', (_nombre, frente, fondo) => {
    expect(contraste(frente, fondo)).toBeGreaterThanOrEqual(4.5);
  });

  it('los alfas son el mínimo necesario: con 0,55 (el valor pedido) el texto suave no alcanzaría', () => {
    expect(contraste(C.textoSuave, componer(C.fondo, 0.55, estrella))).toBeLessThan(4.5);
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
    [`enlace en tarjeta de vidrio (fondo ${i})`, C.enlace, t],
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

  it('mapa de calor de /admin/analitica: el texto se lee (4,5:1) sobre --color-primario mezclado con la tarjeta, con cualquier intensidad', () => {
    for (const tarjeta of tarjetas) {
      for (let paso = 0; paso <= 10; paso++) {
        expect(contraste(C.texto, componer(C.primario, paso / 10, tarjeta))).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('el anillo de foco se ve (3:1) sobre el fondo y sobre las tarjetas de vidrio', () => {
    expect(contraste(variable('admin-foco'), A.oscuro)).toBeGreaterThanOrEqual(3);
    for (const tarjeta of tarjetas) expect(contraste(variable('admin-foco'), tarjeta)).toBeGreaterThanOrEqual(3);
    expect(css).toMatch(/\.tema-admin :focus-visible\s*\{[^}]*outline: 3px solid var\(--admin-foco\)[^}]*box-shadow/);
  });
});
