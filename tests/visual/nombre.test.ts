// @vitest-environment node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// La app se llama Agón. El nombre anterior solo puede quedar en la línea de /privacidad que lo menciona
// («Agón (antes Gym Assistant)»). Los identificadores internos (paquete, tablas, variables de entorno, rutas,
// repositorio y dominio) no están en textos de src y conservan su nombre a propósito (README, «Marca»).
const RAIZ = path.resolve(__dirname, '../..');
const SRC = path.join(RAIZ, 'src');
const VIEJO = /gym assistant/i;

const archivos = (carpeta: string): string[] =>
  readdirSync(carpeta).flatMap((nombre) => {
    const ruta = path.join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.(tsx?|css|svg|txt|json)$/.test(nombre) && !/\.test\.tsx?$/.test(nombre) ? [ruta] : [];
  });

describe('el nombre anterior no aparece en la app', () => {
  it('«Gym Assistant» solo está en la línea «antes Gym Assistant» de /privacidad', () => {
    const hallazgos: string[] = [];
    for (const archivo of archivos(SRC)) {
      readFileSync(archivo, 'utf8')
        .split(/\r?\n/)
        .forEach((linea, i) => {
          if (VIEJO.test(linea) && !linea.includes('(antes Gym Assistant)')) {
            hallazgos.push(`${path.relative(RAIZ, archivo).replace(/\\/g, '/')}:${i + 1}: ${linea.trim()}`);
          }
        });
    }
    expect(hallazgos).toEqual([]);
  });

  it('la línea de /privacidad existe una sola vez', () => {
    const privacidad = readFileSync(path.join(SRC, 'app/privacidad/page.tsx'), 'utf8');
    expect(privacidad.match(/\(antes Gym Assistant\)/g)).toHaveLength(1);
  });

  it('el layout usa la plantilla « · Agón» y ninguna página repite el nombre en su título', () => {
    const layout = readFileSync(path.join(SRC, 'app/layout.tsx'), 'utf8');
    expect(layout).toContain('template: `%s · ${NOMBRE_APP}`');
    expect(layout).not.toContain('NEXT_PUBLIC_APP_NAME ||');
    for (const archivo of archivos(path.join(SRC, 'app'))) {
      const titulo = /title:\s*['`]([^'`]*)['`]/.exec(readFileSync(archivo, 'utf8'))?.[1];
      if (titulo) expect(titulo, archivo).not.toMatch(/Agón|NOMBRE_APP/);
    }
  });

  it('íconos: favicon y manifest de Agón (nunca de CHRONO)', () => {
    const favicon = readFileSync(path.join(SRC, 'app/icon.svg'), 'utf8');
    expect(favicon).toContain('agon-g');
    expect(favicon.toLowerCase()).not.toContain('chrono');
    const manifest = readFileSync(path.join(SRC, 'app/manifest.ts'), 'utf8');
    expect(manifest).toMatch(/name: NOMBRE_APP/);
    expect(manifest).toMatch(/short_name: NOMBRE_APP/);
    for (const png of ['agon-192.png', 'agon-512.png', 'agon-correo.png']) {
      expect(existsSync(path.join(RAIZ, 'public/marca', png)), png).toBe(true);
    }
    expect(existsSync(path.join(SRC, 'app/opengraph-image.png'))).toBe(true);
  });
});
