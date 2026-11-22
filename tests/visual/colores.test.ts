// @vitest-environment node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { COLOR_MARCA } from '@/lib/config/marca';

// Los colores viven en un solo lugar: las variables de src/app/globals.css (expuestas por tailwind.config.ts).
// Esta prueba falla si aparece un verde de Tailwind, un gris/rojo/ámbar de su paleta o un color escrito a mano
// (#hex, rgb(), rgba()) fuera de los archivos permitidos.
const RAIZ = path.resolve(__dirname, '../..');
const SRC = path.join(RAIZ, 'src');

// Archivos que SÍ pueden tener colores escritos a mano, con la razón.
const PERMITIDOS: Record<string, string> = {
  'src/app/globals.css': 'define la paleta (las variables)',
  'src/lib/plantillasCorreo.ts': 'los clientes de correo no leen variables CSS: se actualiza a mano',
};
// Líneas sueltas permitidas: deben llevar el comentario "color-fijo" en la misma línea o en una de las 6 anteriores
// (en el HTML de un correo no se puede comentar en la misma línea).
const MARCA_EXCEPCION = 'color-fijo';

const archivosDeSrc = (carpeta: string): string[] =>
  readdirSync(carpeta).flatMap((nombre) => {
    const ruta = path.join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivosDeSrc(ruta);
    return /\.(tsx?|css)$/.test(nombre) && !/\.test\.tsx?$/.test(nombre) ? [ruta] : [];
  });
const relativo = (ruta: string) => path.relative(RAIZ, ruta).replace(/\\/g, '/');

// Colores escritos a mano. Las entidades HTML (&#128273;) no son colores.
const COLOR_A_MANO = /(?<!&)#[0-9a-fA-F]{3,8}(?![0-9a-zA-Z])|\brgba?\(/;
const PALETA_TAILWIND = /\b[a-z]+-(green|emerald|teal|lime|slate|gray|zinc|neutral|stone|red|orange|amber|yellow)-[0-9]{2,3}\b/;

function hallazgos(patron: RegExp): string[] {
  const encontrados: string[] = [];
  for (const archivo of archivosDeSrc(SRC)) {
    const ruta = relativo(archivo);
    if (PERMITIDOS[ruta]) continue;
    const lineas = readFileSync(archivo, 'utf8').split(/\r?\n/);
    lineas.forEach((linea, i) => {
      if (!patron.test(linea)) return;
      if (lineas.slice(Math.max(0, i - 6), i + 1).some((anterior) => anterior.includes(MARCA_EXCEPCION))) return;
      encontrados.push(`${ruta}:${i + 1}: ${linea.trim().slice(0, 120)}`);
    });
  }
  return encontrados;
}

describe('colores centralizados', () => {
  it('no hay clases de color de la paleta de Tailwind (verdes, grises, rojos, ámbares): solo tokens', () => {
    expect(hallazgos(PALETA_TAILWIND)).toEqual([]);
  });

  it('no hay colores escritos a mano fuera de globals.css, plantillasCorreo.ts y las excepciones "color-fijo"', () => {
    expect(hallazgos(COLOR_A_MANO)).toEqual([]);
  });

  it('tailwind.config.ts no define colores propios: solo lee las variables CSS', () => {
    const config = readFileSync(path.join(RAIZ, 'tailwind.config.ts'), 'utf8');
    expect(config.replace(/\/\/.*$/gm, '')).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });

  it('el lavanda decorativo nunca se usa como color de texto', () => {
    expect(hallazgos(/\btext-lavanda\b/)).toEqual([]);
  });

  it('el theme-color y los correos usan el mismo morado que --color-primario', () => {
    const css = readFileSync(path.join(SRC, 'app/globals.css'), 'utf8');
    const primario = /--color-primario:\s*(#[0-9a-fA-F]{6})/.exec(css)?.[1];
    expect(COLOR_MARCA.toLowerCase()).toBe(primario?.toLowerCase());
    const correos = readFileSync(path.join(SRC, 'lib/plantillasCorreo.ts'), 'utf8').toLowerCase();
    expect(correos).toContain(primario?.toLowerCase());
    // Ningún verde de la marca anterior.
    for (const verde of ['#2e7d53', '#2b7650', '#176d45', '#2bb673', '#eef5f0', '#e4f1ea']) expect(correos).not.toContain(verde);
  });

  it('sin variables viejas de la plantilla inicial en globals.css', () => {
    const css = readFileSync(path.join(SRC, 'app/globals.css'), 'utf8');
    for (const vieja of ['--accent', '--background', '--foreground', '--muted', '--card:', '--border:']) expect(css).not.toContain(vieja);
  });
});
