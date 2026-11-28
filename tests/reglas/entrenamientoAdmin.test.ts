// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { UMBRAL_ANONIMATO } from '@/lib/config/gym';
import {
  aplicarUmbralAnonimato,
  completarDiasSemana,
  completarHoras,
  etiquetaHora,
  leerPeriodoEntrenamiento,
  LETRAS_BASE,
  LETRAS_CON_MARCA,
  masFrecuente,
  normalizarNombreEjercicio,
  promedioSeriesPorSesion,
  repartirEjercicios,
  sqlNombreNormalizado,
} from '@/lib/reglas/entrenamientoAdmin';

describe('normalizarNombreEjercicio', () => {
  it('minúsculas, sin tildes y con los espacios colapsados', () => {
    expect(normalizarNombreEjercicio('  Press   de BANCA  ')).toBe('press de banca');
    expect(normalizarNombreEjercicio('Extensión de TRÍCEPS')).toBe('extension de triceps');
    expect(normalizarNombreEjercicio('Pantorrillas\ten\nmáquina')).toBe('pantorrillas en maquina');
    expect(normalizarNombreEjercicio('Señorita Pingüino')).toBe('senorita pinguino');
  });

  it('variantes del mismo ejercicio quedan iguales', () => {
    const variantes = ['Sentadilla Búlgara', 'sentadilla bulgara', ' SENTADILLA  BÚLGARA', 'Sentadilla Bulgára'];
    expect(new Set(variantes.map(normalizarNombreEjercicio))).toEqual(new Set(['sentadilla bulgara']));
  });

  it('el mapa de letras es el mismo para JS y SQL: misma longitud, sin repetidos y solo letras base sin marca', () => {
    expect([...LETRAS_CON_MARCA]).toHaveLength([...LETRAS_BASE].length);
    expect(new Set(LETRAS_CON_MARCA).size).toBe([...LETRAS_CON_MARCA].length);
    expect(LETRAS_BASE).toMatch(/^[a-z]+$/);
    // Cada letra con marca, quitándole la marca con Unicode, da su letra base del mapa.
    [...LETRAS_CON_MARCA].forEach((letra, i) => {
      expect(letra.normalize('NFD').replace(/[̀-ͯ]/g, '')).toBe(LETRAS_BASE[i]);
    });
  });

  it('la expresión SQL hace lo mismo en el mismo orden (lower, translate, colapsar, btrim) con parámetros', () => {
    expect(sqlNombreNormalizado('e.nombre', '$3', '$4')).toBe(
      "btrim(regexp_replace(translate(lower(e.nombre), $3, $4), '\\s+', ' ', 'g'))",
    );
  });
});

describe('aplicarUmbralAnonimato', () => {
  const FILAS = [
    { nombre: 'press de banca', cuentas: 5, sesiones: 40 },
    { nombre: 'sentadilla', cuentas: 3, sesiones: 12 },
    { nombre: 'curl con nombre raro', cuentas: 2, sesiones: 30 },
    { nombre: 'solo mio', cuentas: 1, sesiones: 50 },
  ];

  it('por defecto deja solo los usados por al menos 3 cuentas (el umbral de la configuración)', () => {
    expect(UMBRAL_ANONIMATO).toBe(3);
    expect(aplicarUmbralAnonimato(FILAS).map((f) => f.nombre)).toEqual(['press de banca', 'sentadilla']);
  });

  it('respeta otro mínimo y no cambia el orden', () => {
    expect(aplicarUmbralAnonimato(FILAS, 2).map((f) => f.nombre)).toEqual(['press de banca', 'sentadilla', 'curl con nombre raro']);
    expect(aplicarUmbralAnonimato([], 3)).toEqual([]);
  });
});

describe('repartirEjercicios', () => {
  it('totales, activos frente a archivados y reparto por tipo con porcentaje', () => {
    const reparto = repartirEjercicios([
      { tipo: 'peso', archivado: false, ejercicios: 6 },
      { tipo: 'peso', archivado: true, ejercicios: 2 },
      { tipo: 'calistenia', archivado: false, ejercicios: 2 },
    ]);
    expect(reparto).toEqual({
      total: 10,
      activos: 8,
      archivados: 2,
      porTipo: [
        { tipo: 'peso', total: 8, activos: 6, archivados: 2, porcentaje: 80 },
        { tipo: 'calistenia', total: 2, activos: 2, archivados: 0, porcentaje: 20 },
      ],
    });
  });

  it('sin ejercicios: los dos tipos en cero, sin dividir por cero', () => {
    const reparto = repartirEjercicios([]);
    expect(reparto.total).toBe(0);
    expect(reparto.porTipo.map((t) => [t.tipo, t.total, t.porcentaje])).toEqual([
      ['peso', 0, 0],
      ['calistenia', 0, 0],
    ]);
  });
});

describe('días de la semana y horas', () => {
  it('completa los 7 días (1 = lunes) y las 24 horas en cero', () => {
    const dias = completarDiasSemana([{ dia: 3, sesiones: 5 }, { dia: 7, sesiones: 1 }]);
    expect(dias.map((d) => d.sesiones)).toEqual([0, 0, 5, 0, 0, 0, 1]);
    const horas = completarHoras([{ hora: 18, sesiones: 9 }]);
    expect(horas).toHaveLength(24);
    expect(horas[18]).toEqual({ hora: 18, sesiones: 9 });
    expect(horas[0]).toEqual({ hora: 0, sesiones: 0 });
    expect(etiquetaHora(7)).toBe('07:00');
  });

  it('el más frecuente es el primero si empatan, y null sin sesiones', () => {
    expect(masFrecuente(completarDiasSemana([{ dia: 2, sesiones: 4 }, { dia: 5, sesiones: 4 }]))).toEqual({ dia: 2, sesiones: 4 });
    expect(masFrecuente(completarDiasSemana([]))).toBeNull();
  });
});

describe('series por sesión y periodo', () => {
  it('promedio con un decimal, 0 sin sesiones', () => {
    expect(promedioSeriesPorSesion(10, 3)).toBe(3.3);
    expect(promedioSeriesPorSesion(9, 3)).toBe(3);
    expect(promedioSeriesPorSesion(0, 0)).toBe(0);
  });

  it('periodo: 30, 90 o 365 días; cualquier otra cosa → 90', () => {
    expect(leerPeriodoEntrenamiento('30')).toBe(30);
    expect(leerPeriodoEntrenamiento(['365'])).toBe(365);
    expect(leerPeriodoEntrenamiento('7')).toBe(90);
    expect(leerPeriodoEntrenamiento(undefined)).toBe(90);
  });
});
