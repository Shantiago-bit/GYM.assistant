// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { EjercicioConHistorial } from '@/lib/reglas/perfil';
import { columnaDeFecha, cuadrosDeMeses, lineaCartela, posicionesDelMes, recordsPorFecha, tituloCartela } from './cuadroMes';

const ejercicio = (e: Partial<EjercicioConHistorial> & Pick<EjercicioConHistorial, 'id' | 'nombre' | 'sesiones'>): EjercicioConHistorial => ({
  tipo: 'peso',
  nivel: null,
  archivado: false,
  ...e,
});
const sesion = (fecha: string, reps: number, kg: number | null = 40) => ({ fecha, series: [{ reps, pesoGramos: kg === null ? null : kg * 1000 }] });
const TODOS = [{ dias: [1, 2, 3, 4, 5, 6, 7], vigenteDesde: '2026-01-01' }];

describe('posiciones del cielo del mes', () => {
  it('columna por semana (la del día 1 es la primera) y fila por día, con el lunes arriba', () => {
    // Noviembre de 2026 empieza en domingo: el 1 está en la columna 0 y el lunes 2, en la 1.
    expect(columnaDeFecha('2026-11-01', '2026-11')).toBe(0);
    expect(columnaDeFecha('2026-11-02', '2026-11')).toBe(1);
    expect(columnaDeFecha('2026-11-30', '2026-11')).toBe(5);
    const [domingo, lunes, martes] = posicionesDelMes('2026-11', [
      { fecha: '2026-11-03', volumen: 10 },
      { fecha: '2026-11-01', volumen: 0 },
      { fecha: '2026-11-02', volumen: 5 },
    ]);
    expect(domingo!.fecha).toBe('2026-11-01');
    expect(domingo!.y).toBeGreaterThan(lunes!.y); // el domingo es la última fila
    expect(lunes!.x).toBe(martes!.x); // misma semana, misma columna
    expect(martes!.y).toBeGreaterThan(lunes!.y);
  });

  it('el tamaño crece con el volumen del día; sin volumen, el mínimo', () => {
    const [a, b, c] = posicionesDelMes('2026-11', [
      { fecha: '2026-11-02', volumen: 0 },
      { fecha: '2026-11-03', volumen: 50 },
      { fecha: '2026-11-04', volumen: 100 },
    ]);
    expect(a!.radio).toBe(1.1);
    expect(b!.radio).toBeGreaterThan(a!.radio);
    expect(c!.radio).toBe(2.6);
  });

  it('todas las estrellas caen dentro del lienzo de 100 × 125', () => {
    const dias = Array.from({ length: 31 }, (_, i) => ({ fecha: `2026-08-${String(i + 1).padStart(2, '0')}`, volumen: i }));
    for (const estrella of posicionesDelMes('2026-08', dias)) {
      expect(estrella.x).toBeGreaterThan(0);
      expect(estrella.x).toBeLessThan(100);
      expect(estrella.y).toBeGreaterThan(40);
      expect(estrella.y).toBeLessThan(125);
    }
  });
});

describe('título de la cartela', () => {
  const base = { mes: '2026-11', records: 0, semanasCompletasSeguidas: 0, regreso: false, primerMes: false };
  it.each([
    [{ ...base, records: 3 }, 'El mes del récord'],
    [{ ...base, semanasCompletasSeguidas: 3 }, 'La constancia de noviembre'],
    [{ ...base, regreso: true }, 'El regreso'],
    [{ ...base, primerMes: true }, 'Primeros pasos'],
    [base, 'Noviembre, en movimiento'],
    [{ ...base, records: 4, semanasCompletasSeguidas: 4, primerMes: true }, 'El mes del récord'],
    [{ ...base, records: 2, semanasCompletasSeguidas: 2 }, 'Noviembre, en movimiento'],
  ])('%o → %s', (datos, titulo) => {
    expect(tituloCartela(datos)).toBe(titulo);
  });

  it('la línea: "12 días · 3 récords · racha de 9"', () => {
    const records = [1, 2, 3].map((n) => ({ fecha: `2026-11-0${n}`, nombre: 'Press', marca: '40 kg × 8' }));
    expect(lineaCartela({ dias: 12, records, mejorRacha: 9 })).toBe('12 días · 3 récords · racha de 9');
    expect(lineaCartela({ dias: 1, records: records.slice(0, 1), mejorRacha: 0 })).toBe('1 día · 1 récord');
  });
});

describe('récords por fecha', () => {
  it('la primera sesión no es récord; con peso, el mayor peso (o más repeticiones con el mismo); en calistenia, repeticiones', () => {
    const records = recordsPorFecha([
      ejercicio({ id: 'e1', nombre: 'Press', sesiones: [sesion('2026-10-01', 8, 40), sesion('2026-10-08', 9, 40), sesion('2026-10-15', 6, 42.5), sesion('2026-10-22', 5, 42.5)] }),
      ejercicio({ id: 'e2', nombre: 'Dominadas', tipo: 'calistenia', sesiones: [sesion('2026-10-01', 8, null), sesion('2026-10-09', 10, null)] }),
    ]);
    expect(records.get('2026-10-01')).toBeUndefined();
    expect(records.get('2026-10-08')).toEqual([{ nombre: 'Press', marca: '40 kg × 9' }]);
    expect(records.get('2026-10-15')).toEqual([{ nombre: 'Press', marca: '42,5 kg × 6' }]);
    expect(records.get('2026-10-22')).toBeUndefined();
    expect(records.get('2026-10-09')).toEqual([{ nombre: 'Dominadas', marca: '10 repeticiones' }]);
  });
});

describe('cuadros de la galería', () => {
  const historial = [
    ejercicio({
      id: 'e1',
      nombre: 'Press',
      sesiones: [sesion('2026-08-03', 8), sesion('2026-10-05', 9), sesion('2026-10-06', 10), sesion('2026-10-07', 11), sesion('2026-11-02', 11)],
    }),
  ];

  it('el mes en curso siempre, en proceso, y los anteriores con sesiones, del más reciente al más antiguo', () => {
    const cuadros = cuadrosDeMeses({ historial, historialDias: TODOS, hoy: '2026-11-20' });
    expect(cuadros.map((cuadro) => [cuadro.mes, cuadro.actual])).toEqual([
      ['2026-11', true],
      ['2026-10', false],
      ['2026-08', false],
    ]);
  });

  it('cifras, récords con su marca, estrellas y títulos: primeros pasos, el regreso y el mes del récord', () => {
    const [noviembre, octubre, agosto] = cuadrosDeMeses({ historial, historialDias: TODOS, hoy: '2026-11-20' });
    expect(agosto!.titulo).toBe('Primeros pasos');
    // Un récord por ejercicio (el mejor del mes), como el resumen y la imagen para compartir: aquí, uno solo.
    expect(octubre!.titulo).toBe('El regreso');
    expect(octubre!.regreso).toBe(true); // septiembre no tuvo sesiones
    expect(octubre!.records.map((record) => record.marca)).toEqual(['40 kg × 11']);
    // Las estrellas de cada día conservan sus récords: 9, 10 y 11 repeticiones.
    expect(octubre!.estrellas).toHaveLength(3);
    expect(octubre!.estrellas.every((estrella) => estrella.records.length === 1)).toBe(true);
    expect(octubre!.mejorRacha).toBe(3);
    expect(octubre!.estrella).toEqual({ nombre: 'Press', sesiones: 3 });
    expect(octubre!.volumenKg).toBe(1200);
    expect(noviembre!.records).toEqual([]); // 11 repeticiones no supera las 11 de octubre
    expect(octubre!.tono).not.toBe(noviembre!.tono);
  });

  it('las semanas completadas del mes aparecen como constelaciones (con su geometría)', () => {
    // Un día a la semana (lunes) y cuatro lunes seguidos entrenados: 4 constelaciones completas, Estrella Polar.
    const lunes = ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23'];
    const [noviembre] = cuadrosDeMeses({
      historial: [ejercicio({ id: 'e1', nombre: 'Press', sesiones: lunes.map((fecha) => sesion(fecha, 8)) })],
      historialDias: [{ dias: [1], vigenteDesde: '2026-01-01' }],
      hoy: '2026-11-30',
    });
    expect(noviembre!.constelaciones.map((c) => c.constelacion.nombre)).toEqual(['Estrella Polar', 'Estrella Polar', 'Estrella Polar', 'Estrella Polar']);
    expect(noviembre!.semanasCompletasSeguidas).toBe(4);
    expect(noviembre!.titulo).toBe('La constancia de noviembre');
  });

  it('sin sesiones: solo el mes en curso, vacío', () => {
    const cuadros = cuadrosDeMeses({ historial: [], historialDias: TODOS, hoy: '2026-11-20' });
    expect(cuadros).toHaveLength(1);
    expect(cuadros[0]).toMatchObject({ mes: '2026-11', actual: true, dias: 0, estrellas: [] });
  });
});
