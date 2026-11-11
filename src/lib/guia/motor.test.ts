// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buscarPasoDisponible,
  cumpleCondicion,
  numeracion,
  objetivos,
  pasoAnterior,
  pasoParaReanudar,
  recorridoDeRuta,
  rutaDeEntrada,
  siguientePaso,
} from './motor';
import { huecoDe, posicionarBurbuja } from './posicion';
import { IDS_RECORRIDO, RECORRIDOS, type PasoGuia } from './recorridos';

const paso = (objetivo: PasoGuia['objetivo'], extra: Partial<PasoGuia> = {}): PasoGuia => ({
  objetivo,
  titulo: 't',
  texto: 'x',
  tipo: 'info',
  ...extra,
});

const PASOS = [paso('a'), paso('b'), paso('c'), paso(null), paso('e')];
const enPantalla = (ids: string[]) => (id: string) => ids.includes(id);

describe('avanzar y retroceder', () => {
  it('avanza al siguiente paso con objetivo en pantalla y salta los que no lo tienen', () => {
    expect(siguientePaso(PASOS, 0, enPantalla(['a', 'b', 'c', 'e']))).toBe(1);
    expect(siguientePaso(PASOS, 0, enPantalla(['a', 'c']))).toBe(2);
    expect(siguientePaso(PASOS, 0, enPantalla(['a']))).toBe(3); // sin objetivo: burbuja centrada
  });

  it('al final del recorrido no hay siguiente', () => {
    expect(siguientePaso(PASOS, 4, enPantalla(['a', 'b', 'c', 'e']))).toBeNull();
    expect(siguientePaso([paso('a'), paso('b')], 0, enPantalla(['a']))).toBeNull();
  });

  it('retrocede saltando los pasos sin objetivo y no pasa del primero', () => {
    expect(pasoAnterior(PASOS, 2, enPantalla(['a', 'c']))).toBe(0);
    expect(pasoAnterior(PASOS, 0, enPantalla(['a']))).toBeNull();
  });

  it('busca el primer paso disponible desde un índice', () => {
    expect(buscarPasoDisponible(PASOS, 0, 1, enPantalla(['c']))).toBe(2);
    expect(buscarPasoDisponible([paso('x')], 0, 1, enPantalla([]))).toBeNull();
  });

  it('acepta varios objetivos y usa cualquiera que esté en pantalla', () => {
    const pasos = [paso(['escritorio', 'movil'])];
    expect(objetivos(pasos[0]!)).toEqual(['escritorio', 'movil']);
    expect(buscarPasoDisponible(pasos, 0, 1, enPantalla(['movil']))).toBe(0);
  });
});

describe('numeración', () => {
  it('cuenta solo los pasos que se pueden mostrar en la pantalla', () => {
    // Sin 'a' ni 'c' en pantalla: quedan b, el paso sin objetivo y e.
    expect(numeracion(PASOS, 1, enPantalla(['b', 'e']))).toEqual({ numero: 1, total: 3 });
    expect(numeracion(PASOS, 4, enPantalla(['b', 'e']))).toEqual({ numero: 3, total: 3 });
    expect(numeracion(PASOS, 0, enPantalla(['a', 'b', 'c', 'e']))).toEqual({ numero: 1, total: 5 });
  });
});

describe('condiciones de los pasos interactivos', () => {
  it('sin condición siempre se puede seguir', () => {
    expect(cumpleCondicion(undefined, { hayTexto: false, cambiado: false })).toBe(true);
  });

  it('con_texto espera que el campo tenga texto', () => {
    expect(cumpleCondicion({ tipo: 'con_texto' }, { hayTexto: false, cambiado: true })).toBe(false);
    expect(cumpleCondicion({ tipo: 'con_texto' }, { hayTexto: true, cambiado: false })).toBe(true);
  });

  it('cambiado espera que la persona elija algo', () => {
    expect(cumpleCondicion({ tipo: 'cambiado' }, { hayTexto: true, cambiado: false })).toBe(false);
    expect(cumpleCondicion({ tipo: 'cambiado' }, { hayTexto: false, cambiado: true })).toBe(true);
  });
});

describe('reanudar y rutas', () => {
  const recorrido = RECORRIDOS.crear_ejercicio;

  it('reanuda en el paso guardado si el recorrido quedó en curso', () => {
    expect(pasoParaReanudar({ estado: 'en_curso', paso: 3 }, recorrido)).toBe(3);
    expect(pasoParaReanudar({ estado: 'en_curso', paso: 99 }, recorrido)).toBe(recorrido.pasos.length - 1);
    expect(pasoParaReanudar({ estado: 'completado', paso: 3 }, recorrido)).toBe(0);
    expect(pasoParaReanudar(undefined, recorrido)).toBe(0);
  });

  it('reconoce el recorrido de cada página sin confundir "nuevo" con un ejercicio', () => {
    expect(recorridoDeRuta('/gym')?.id).toBe('inicio');
    expect(recorridoDeRuta('/gym/ejercicios/nuevo')?.id).toBe('crear_ejercicio');
    expect(recorridoDeRuta('/gym/ejercicios/abc-123')?.id).toBe('detalle');
    expect(recorridoDeRuta('/gym/ejercicios/abc-123/prueba')?.id).toBe('prueba_inicial');
    expect(recorridoDeRuta('/gym/ejercicios/abc-123/sesion')?.id).toBe('sesion');
    expect(recorridoDeRuta('/gym/resumen')).toBeNull();
  });

  it('calcula la página de entrada y exige un ejercicio adecuado cuando hace falta', () => {
    const ninguno = { sinPrueba: null, conPrueba: null };
    expect(rutaDeEntrada('inicio', ninguno)).toBe('/gym');
    expect(rutaDeEntrada('crear_ejercicio', ninguno)).toBe('/gym/ejercicios/nuevo');
    expect(rutaDeEntrada('prueba_inicial', ninguno)).toBeNull();
    expect(rutaDeEntrada('prueba_inicial', { sinPrueba: 'e1', conPrueba: 'e2' })).toBe('/gym/ejercicios/e1/prueba');
    expect(rutaDeEntrada('sesion', { sinPrueba: 'e1', conPrueba: 'e2' })).toBe('/gym/ejercicios/e2/sesion');
  });
});

describe('recorridos', () => {
  it('cada paso de navegación indica el recorrido que sigue y la cadena llega hasta la sesión', () => {
    const cadena = ['inicio'];
    let actual = RECORRIDOS.inicio;
    for (;;) {
      const navegacion = actual.pasos.find((p) => p.tipo === 'navegacion');
      if (!navegacion) break;
      expect(navegacion.continua).toBeDefined();
      actual = RECORRIDOS[navegacion.continua!];
      cadena.push(actual.id);
    }
    expect(cadena).toEqual(['inicio', 'crear_ejercicio', 'prueba_inicial', 'detalle', 'sesion']);
  });

  it('los textos usan los números de la configuración, no valores copiados a mano', () => {
    const textos = JSON.stringify(RECORRIDOS);
    expect(textos).toContain('8–12');
    expect(textos).toContain('55 kg');
    expect(textos).toContain('10 %');
  });

  // Cada objetivo debe existir como data-guia en algún componente; si se renombra uno, esta prueba avisa.
  it('cada objetivo de los recorridos está marcado con data-guia en el código', () => {
    const archivos: string[] = [];
    const recorrer = (carpeta: string) => {
      for (const nombre of readdirSync(carpeta)) {
        const ruta = path.join(carpeta, nombre);
        if (statSync(ruta).isDirectory()) recorrer(ruta);
        else if (ruta.endsWith('.tsx')) archivos.push(ruta);
      }
    };
    recorrer(path.resolve(__dirname, '../..'));
    const codigo = archivos.map((archivo) => readFileSync(archivo, 'utf8')).join('\n');
    const faltan = IDS_RECORRIDO.flatMap((id) => RECORRIDOS[id].pasos.flatMap(objetivos)).filter(
      (id) => !codigo.includes(`'${id}'`) && !codigo.includes(`"${id}"`),
    );
    expect(faltan).toEqual([]);
  });
});

describe('posición de la burbuja', () => {
  const ventana = { ancho: 1000, alto: 800 };
  const burbuja = { ancho: 300, alto: 150 };

  it('el hueco agrega 8 px alrededor del elemento sin salirse de la pantalla', () => {
    expect(huecoDe({ top: 100, left: 50, width: 200, height: 40 }, ventana)).toEqual({ top: 92, left: 42, width: 216, height: 56 });
    expect(huecoDe({ top: 2, left: 0, width: 50, height: 10 }, ventana)).toMatchObject({ top: 0, left: 0 });
  });

  it('va debajo si cabe, arriba si no, y nunca fuera de la pantalla', () => {
    const abajo = posicionarBurbuja({ top: 100, left: 900, width: 80, height: 40 }, burbuja, ventana);
    expect(abajo.lado).toBe('abajo');
    expect(abajo.left + burbuja.ancho).toBeLessThanOrEqual(ventana.ancho - 12);

    expect(posicionarBurbuja({ top: 700, left: 100, width: 80, height: 40 }, burbuja, ventana).lado).toBe('arriba');
  });

  it('pasa al costado si no cabe arriba ni abajo, y se centra si no cabe en ningún lado', () => {
    expect(posicionarBurbuja({ top: 100, left: 100, width: 200, height: 600 }, burbuja, ventana).lado).toBe('derecha');
    expect(posicionarBurbuja({ top: 0, left: 0, width: 1000, height: 800 }, burbuja, ventana).lado).toBe('centro');
    expect(posicionarBurbuja(null, burbuja, ventana)).toEqual({ top: 325, left: 350, lado: 'centro' });
  });
});
