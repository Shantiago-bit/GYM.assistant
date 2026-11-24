// @vitest-environment node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// La app se llama Kairós. Los nombres anteriores (Gym Assistant y Agón) solo pueden quedar en la línea histórica de
// /privacidad («Kairós (antes Agón y Gym Assistant)») y en src/lib/almacenamiento.ts, que migra las claves del
// navegador con el nombre anterior. Los identificadores internos (paquete, tablas, variables de entorno, rutas,
// repositorio y dominio) conservan su nombre a propósito (README, «Marca»).
const RAIZ = path.resolve(__dirname, '../..');
const SRC = path.join(RAIZ, 'src');
// «Agón», «AGÓN», «Agon», «AGON» como palabra (no «cagón» de la lista de nombres bloqueados) y las claves agon_*.
const VIEJO = /gym assistant|(?<![a-záéíóúñ])ag[oó]n(?![a-záéíóúñ])|agon[-_:]/i;
const LINEA_HISTORICA = '(antes Agón y Gym Assistant)';
const MIGRACION = 'src/lib/almacenamiento.ts';

const archivos = (carpeta: string): string[] =>
  readdirSync(carpeta).flatMap((nombre) => {
    const ruta = path.join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.(tsx?|css|svg|txt|json)$/.test(nombre) && !/\.test\.tsx?$/.test(nombre) ? [ruta] : [];
  });

describe('el nombre anterior no aparece en la app', () => {
  it('«Gym Assistant», «Agón» o «Agon» solo están en la línea histórica de /privacidad y en la migración de claves', () => {
    const hallazgos: string[] = [];
    for (const archivo of archivos(SRC)) {
      if (path.relative(RAIZ, archivo).replace(/\\/g, '/') === MIGRACION) continue;
      readFileSync(archivo, 'utf8')
        .split(/\r?\n/)
        .forEach((linea, i) => {
          if (VIEJO.test(linea) && !linea.includes(LINEA_HISTORICA)) {
            hallazgos.push(`${path.relative(RAIZ, archivo).replace(/\\/g, '/')}:${i + 1}: ${linea.trim()}`);
          }
        });
    }
    expect(hallazgos).toEqual([]);
  });

  it('la línea de /privacidad existe una sola vez', () => {
    const privacidad = readFileSync(path.join(SRC, 'app/privacidad/page.tsx'), 'utf8');
    expect(privacidad.split(LINEA_HISTORICA)).toHaveLength(2);
  });

  it('el layout usa la plantilla « · Kairós» y ninguna página repite el nombre en su título', () => {
    const layout = readFileSync(path.join(SRC, 'app/layout.tsx'), 'utf8');
    expect(layout).toContain('template: `%s · ${NOMBRE_APP}`');
    expect(layout).not.toContain('NEXT_PUBLIC_APP_NAME ||');
    for (const archivo of archivos(path.join(SRC, 'app'))) {
      const titulo = /title:\s*['`]([^'`]*)['`]/.exec(readFileSync(archivo, 'utf8'))?.[1];
      if (titulo) expect(titulo, archivo).not.toMatch(/Kairós|NOMBRE_APP/);
    }
  });

  it('íconos: favicon y manifest de Kairós (nunca de CHRONO)', () => {
    const favicon = readFileSync(path.join(SRC, 'app/icon.svg'), 'utf8');
    expect(favicon).toContain('kairos-g');
    expect(favicon.toLowerCase()).not.toContain('chrono');
    const manifest = readFileSync(path.join(SRC, 'app/manifest.ts'), 'utf8');
    expect(manifest).toMatch(/name: NOMBRE_APP/);
    expect(manifest).toMatch(/short_name: NOMBRE_APP/);
    for (const png of ['kairos-192.png', 'kairos-512.png', 'kairos-correo.png']) {
      expect(existsSync(path.join(RAIZ, 'public/marca', png)), png).toBe(true);
    }
    expect(existsSync(path.join(SRC, 'app/opengraph-image.png'))).toBe(true);
  });
});
