// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { MarcaSesion, SesionInicio } from '@/lib/reglas/inicio';
import {
  esMesValido,
  mesAnterior,
  mesDelAviso,
  nombreMes,
  resumenMes,
  textoComparacion,
  textosImagen,
  ultimoDia,
} from '@/lib/reglas/resumenMes';

const NOMBRES: Record<string, string> = { e1: 'Press de banca', e2: 'Dominadas', e3: 'Sentadilla', e4: 'Remo' };
const sesion = (ejercicioId: string, fecha: string, series: [number, number | null][]): SesionInicio => ({
  ejercicioId,
  nombre: NOMBRES[ejercicioId]!,
  tipo: ejercicioId === 'e2' ? 'calistenia' : 'peso',
  fecha,
  series: series.map(([reps, kg]) => ({ reps, pesoGramos: kg === null ? null : kg * 1000 })),
});
const marcasDe = (sesiones: SesionInicio[]): MarcaSesion[] =>
  sesiones.map((s) => {
    const peso = Math.max(...s.series.map((x) => x.pesoGramos ?? 0));
    return {
      ejercicioId: s.ejercicioId,
      nombre: s.nombre,
      tipo: s.tipo,
      fecha: s.fecha,
      pesoMaxGramos: s.tipo === 'peso' ? peso : null,
      repsEnPesoMax: s.tipo === 'peso' ? Math.max(...s.series.filter((x) => (x.pesoGramos ?? 0) === peso).map((x) => x.reps)) : null,
      repsMax: Math.max(...s.series.map((x) => x.reps)),
    };
  });
const TODOS_LOS_DIAS = [{ dias: [1, 2, 3, 4, 5, 6, 7], vigenteDesde: '2026-01-01' }];

const resumen = (sesiones: SesionInicio[], mes = '2026-11') =>
  resumenMes({ mes, sesiones, marcas: marcasDe(sesiones), historialDias: TODOS_LOS_DIAS });

describe('fechas del mes', () => {
  it('valida AAAA-MM, último día (con bisiestos), mes anterior y nombre', () => {
    expect(esMesValido('2026-11')).toBe(true);
    expect(esMesValido('2026-13')).toBe(false);
    expect(esMesValido('2026-1')).toBe(false);
    expect(ultimoDia('2026-11')).toBe('2026-11-30');
    expect(ultimoDia('2028-02')).toBe('2028-02-29');
    expect(mesAnterior('2026-01')).toBe('2025-12');
    expect(nombreMes('2026-11')).toBe('noviembre');
    expect(nombreMes('2026-11', true)).toBe('noviembre de 2026');
  });
});

describe('resumen del mes', () => {
  const SESIONES = [
    sesion('e1', '2026-10-05', [[10, 60]]),
    sesion('e1', '2026-10-20', [[10, 60], [10, 60]]),
    sesion('e2', '2026-10-21', [[8, null]]),
    sesion('e1', '2026-11-02', [[11, 60]]),
    sesion('e1', '2026-11-03', [[8, 62.5]]),
    sesion('e2', '2026-11-03', [[10, null]]),
    sesion('e1', '2026-11-04', [[9, 62.5]]),
    sesion('e3', '2026-11-10', [[5, 100]]),
    sesion('e1', '2026-11-20', [[7, 60]]),
  ];

  it('sesiones, días, volumen y comparación con el mes anterior', () => {
    const r = resumen(SESIONES);
    expect(r.sesiones).toBe(6);
    expect(r.dias).toBe(5);
    expect(r.volumenKg).toBe(Math.round((11 * 60 + 8 * 62.5 + 9 * 62.5 + 5 * 100 + 7 * 60) * 1000 / 1000));
    expect(r.anterior).toEqual({ sesiones: 3, dias: 3, volumenKg: 1800 });
  });

  it('mejor racha dentro del mes (con todos los días elegidos: 2, 3 y 4 seguidos = 3)', () => {
    expect(resumen(SESIONES).mejorRacha).toBe(3);
  });

  it('récords del mes: solo los que superan una marca anterior; uno por ejercicio (el último), el más reciente primero', () => {
    const r = resumen(SESIONES);
    // Press: 60×11 el 2 y 62,5×8 el 3 y 62,5×9 el 4 → queda el del 4. Dominadas: 10 > 8. Sentadilla: primera vez, no cuenta.
    expect(r.records.map((x) => `${x.nombre} ${x.fecha} ${x.pesoGramos} ${x.reps}`)).toEqual([
      'Press de banca 2026-11-04 62500 9',
      'Dominadas 2026-11-03 null 10',
    ]);
    expect(r.totalRecords).toBe(2);
  });

  it('a lo sumo 3 récords, pero cuenta todos', () => {
    const sesiones = ['e1', 'e2', 'e3', 'e4'].flatMap((id, i) => [
      sesion(id, '2026-10-01', [[5, id === 'e2' ? null : 50]]),
      sesion(id, `2026-11-0${i + 1}`, [[6, id === 'e2' ? null : 50]]),
    ]);
    const r = resumen(sesiones);
    expect(r.records).toHaveLength(3);
    expect(r.totalRecords).toBe(4);
  });

  it('ejercicio estrella: el de más sesiones del mes', () => {
    expect(resumen(SESIONES).estrella).toEqual({ ejercicioId: 'e1', nombre: 'Press de banca', sesiones: 4 });
  });

  it('un mes sin sesiones', () => {
    const r = resumen(SESIONES, '2026-12');
    expect(r).toMatchObject({ sesiones: 0, dias: 0, mejorRacha: 0, records: [], totalRecords: 0, estrella: null, volumenKg: 0 });
    expect(r.anterior.sesiones).toBe(6);
  });

  it('las series de calentamiento no suman volumen', () => {
    const conCalentamiento: SesionInicio = {
      ...sesion('e1', '2026-11-02', [[10, 60]]),
      series: [{ reps: 10, pesoGramos: 30000, tipoSerie: 'aproximacion' }, { reps: 10, pesoGramos: 60000 }],
    };
    expect(resumen([conCalentamiento]).volumenKg).toBe(600);
  });
});

describe('textos', () => {
  it('comparación con el mes anterior', () => {
    expect(textoComparacion(12, 9, '2026-11')).toBe('3 más que en octubre');
    expect(textoComparacion(7, 9, '2026-11')).toBe('2 menos que en octubre');
    expect(textoComparacion(9, 9, '2026-01')).toBe('igual que en diciembre');
  });

  it('el aviso sale del 1 al 7 del mes siguiente, si hubo sesiones y no se cerró', () => {
    expect(mesDelAviso('2026-12-01', null, true)).toBe('2026-11');
    expect(mesDelAviso('2026-12-07', null, true)).toBe('2026-11');
    expect(mesDelAviso('2026-12-08', null, true)).toBeNull();
    expect(mesDelAviso('2026-12-02', '2026-11', true)).toBeNull();
    expect(mesDelAviso('2026-12-02', null, false)).toBeNull();
    expect(mesDelAviso('2027-01-01', null, true)).toBe('2026-12');
  });
});

describe('imagen para compartir', () => {
  const r = resumen([
    sesion('e1', '2026-10-05', [[10, 60]]),
    sesion('e1', '2026-11-02', [[8, 62.5]]),
    sesion('e1', '2026-11-03', [[8, 62.5]]),
  ]);

  it('por defecto: sin apodo, sin pesos; días, racha, número de récords y ejercicio estrella', () => {
    const t = textosImagen(r, { apodo: null, conPesos: false });
    expect(t.titulo).toBe('Mi mes en el gym');
    expect(t.cifras.map((c) => `${c.valor} ${c.etiqueta}`)).toEqual(['2 días entrenados', '2 días de racha', '1 récord personal']);
    expect(t.records).toEqual([]);
    expect(t.estrella).toBe('Press de banca');
    expect(JSON.stringify(t)).not.toMatch(/kg/);
  });

  it('con los interruptores: el apodo en el título y los pesos de los récords', () => {
    const t = textosImagen(r, { apodo: 'Ani', conPesos: true });
    expect(t.titulo).toBe('El mes de Ani en el gym');
    expect(t.records).toEqual(['Press de banca: 62,5 kg × 8']);
  });
});
