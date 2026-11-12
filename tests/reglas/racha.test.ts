// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  calcularRacha,
  diaSemana,
  diasEnFecha,
  diasValidos,
  listaDias,
  normalizarDias,
  textoDias,
  type TramoDias,
} from '@/lib/reglas/racha';

// Diciembre de 2026: lunes 7, martes 8, miércoles 9, jueves 10, viernes 11, sábado 12, domingo 13, lunes 14.
const LXV: TramoDias[] = [{ dias: [1, 3, 5], vigenteDesde: '2026-01-01' }];
const SIN_EXTRAS = { contarExtras: false };
const CON_EXTRAS = { contarExtras: true, extrasDesde: '2026-01-01' };

describe('días de la semana', () => {
  it('usa la numeración ISO (1 = lunes, 7 = domingo)', () => {
    expect(diaSemana('2026-12-07')).toBe(1);
    expect(diaSemana('2026-12-13')).toBe(7);
  });

  it('valida, normaliza y escribe los días', () => {
    expect(diasValidos([])).toBe(false);
    expect(diasValidos([1, 1])).toBe(false);
    expect(diasValidos([0, 8])).toBe(false);
    expect(diasValidos([1, 2, 3, 4, 5, 6, 7])).toBe(true);
    expect(normalizarDias([5, 1, 3, 3])).toEqual([1, 3, 5]);
    expect(textoDias([5, 1, 3])).toBe('L · X · V');
    expect(listaDias([1, 3, 5])).toBe('lunes, miércoles y viernes');
    expect(listaDias([7])).toBe('domingo');
  });

  it('sin historial vale lunes a sábado; antes del primer tramo, los días del primer tramo', () => {
    expect(diasEnFecha([], '2026-12-07')).toEqual([1, 2, 3, 4, 5, 6]);
    expect(diasEnFecha([{ dias: [2], vigenteDesde: '2026-12-10' }], '2026-12-01')).toEqual([2]);
  });
});

describe('racha con 3 días (L-X-V)', () => {
  it('cuenta solo los días planificados; los de descanso no la rompen', () => {
    const fechas = ['2026-12-07', '2026-12-09', '2026-12-11'];
    expect(calcularRacha(fechas, '2026-12-11', LXV, SIN_EXTRAS)).toMatchObject({ actual: 3, mejor: 3 });
    // El sábado y el domingo son descanso: la racha sigue.
    expect(calcularRacha(fechas, '2026-12-13', LXV, SIN_EXTRAS)).toMatchObject({ actual: 3, hoyEsDescanso: true });
  });

  it('entrenar martes o jueves no rompe ni reemplaza un día planificado perdido', () => {
    // Faltó el miércoles 9 y entrenó el jueves 10: la racha se rompe igual.
    const fechas = ['2026-12-07', '2026-12-10', '2026-12-11'];
    expect(calcularRacha(fechas, '2026-12-11', LXV, CON_EXTRAS)).toMatchObject({ actual: 2, mejor: 2 });
    expect(calcularRacha(fechas, '2026-12-11', LXV, SIN_EXTRAS)).toMatchObject({ actual: 1 });
  });

  it('un día extra suma con RACHA_CUENTA_DIAS_EXTRA y no suma sin ella', () => {
    const fechas = ['2026-12-07', '2026-12-08', '2026-12-09'];
    expect(calcularRacha(fechas, '2026-12-09', LXV, CON_EXTRAS).actual).toBe(3);
    expect(calcularRacha(fechas, '2026-12-09', LXV, SIN_EXTRAS).actual).toBe(2);
  });

  it('los días extra anteriores a la fecha de inicio de la regla no cuentan', () => {
    const fechas = ['2026-12-07', '2026-12-08', '2026-12-09'];
    expect(calcularRacha(fechas, '2026-12-09', LXV, { contarExtras: true, extrasDesde: '2026-12-09' }).actual).toBe(2);
  });

  it('hoy planificado sin sesión: la racha sigue viva desde el día planificado anterior', () => {
    const fechas = ['2026-12-07', '2026-12-09'];
    expect(calcularRacha(fechas, '2026-12-11', LXV, SIN_EXTRAS)).toMatchObject({
      actual: 2,
      hoyEsDescanso: false,
      proximoDiaPlanificado: '2026-12-14',
    });
  });

  it('da el próximo día planificado y si hoy es descanso', () => {
    expect(calcularRacha([], '2026-12-08', LXV)).toMatchObject({ hoyEsDescanso: true, proximoDiaPlanificado: '2026-12-09' });
    expect(calcularRacha([], '2026-12-08', LXV)).toMatchObject({ actual: 0, mejor: 0 });
  });
});

describe('otros calendarios', () => {
  it('7 días: cada día cuenta y uno sin sesión la rompe', () => {
    const todos: TramoDias[] = [{ dias: [1, 2, 3, 4, 5, 6, 7], vigenteDesde: '2026-01-01' }];
    expect(calcularRacha(['2026-12-12', '2026-12-13', '2026-12-14'], '2026-12-14', todos).actual).toBe(3);
    expect(calcularRacha(['2026-12-11', '2026-12-13', '2026-12-14'], '2026-12-14', todos).actual).toBe(2);
    expect(calcularRacha([], '2026-12-14', todos).hoyEsDescanso).toBe(false);
  });

  it('1 día (sábado): una sesión por semana mantiene la racha', () => {
    const sabados: TramoDias[] = [{ dias: [6], vigenteDesde: '2026-01-01' }];
    const fechas = ['2026-11-28', '2026-12-05', '2026-12-12'];
    expect(calcularRacha(fechas, '2026-12-16', sabados, SIN_EXTRAS)).toMatchObject({
      actual: 3,
      mejor: 3,
      proximoDiaPlanificado: '2026-12-19',
    });
    // Se saltó el sábado 5.
    expect(calcularRacha(['2026-11-28', '2026-12-12'], '2026-12-16', sabados, SIN_EXTRAS)).toMatchObject({ actual: 1, mejor: 1 });
  });

  it('cruza cambios de mes y de año', () => {
    const lxv: TramoDias[] = [{ dias: [1, 3, 5], vigenteDesde: '2026-01-01' }];
    // Lunes 28, miércoles 30 de diciembre de 2026, viernes 1 y lunes 4 de enero de 2027.
    const fechas = ['2026-12-28', '2026-12-30', '2027-01-01', '2027-01-04'];
    expect(calcularRacha(fechas, '2027-01-04', lxv, SIN_EXTRAS).actual).toBe(4);
  });
});

describe('cambio de días a mitad de una racha', () => {
  // Hasta el domingo 13 entrenaba L-X-V; desde el lunes 14, todos los días.
  const historial: TramoDias[] = [
    { dias: [1, 3, 5], vigenteDesde: '2026-01-01' },
    { dias: [1, 2, 3, 4, 5, 6, 7], vigenteDesde: '2026-12-14' },
  ];

  it('cada fecha se evalúa con los días vigentes ese día', () => {
    // El martes 8 y el jueves 10 eran descanso entonces: no rompen. Desde el 14, cada día cuenta.
    const fechas = ['2026-12-07', '2026-12-09', '2026-12-11', '2026-12-14', '2026-12-15'];
    expect(calcularRacha(fechas, '2026-12-15', historial, SIN_EXTRAS).actual).toBe(5);
  });

  it('el cambio no reescribe la mejor racha pasada', () => {
    const fechas = ['2026-11-30', '2026-12-02', '2026-12-04', '2026-12-07', '2026-12-09', '2026-12-11'];
    const antes = calcularRacha(fechas, '2026-12-13', historial.slice(0, 1), SIN_EXTRAS);
    // Con los días nuevos, el miércoles 16 sin sesión rompe la racha actual, pero la mejor sigue igual.
    const despues = calcularRacha([...fechas, '2026-12-14'], '2026-12-17', historial, SIN_EXTRAS);
    expect(antes.mejor).toBe(6);
    expect(despues.actual).toBe(0);
    expect(despues.mejor).toBe(7);
  });
});

describe('regresión: lunes a sábado sin días extra da lo mismo que antes', () => {
  const regresion = (fechas: string[], hoy: string) => calcularRacha(fechas, hoy, [], SIN_EXTRAS);

  it.each([
    [['2026-11-06', '2026-11-07', '2026-11-09', '2026-11-10'], '2026-11-10', 4, 4],
    [['2026-11-07', '2026-11-08', '2026-11-09'], '2026-11-09', 2, 2],
    [['2026-11-09', '2026-11-10'], '2026-11-11', 2, 2],
    [['2026-11-06', '2026-11-07'], '2026-11-09', 2, 2],
    [['2026-11-06', '2026-11-07'], '2026-11-08', 2, 2],
    [['2026-11-05', '2026-11-07'], '2026-11-07', 1, 1],
    [['2026-11-09'], '2026-11-11', 0, 1],
    [['2026-10-30', '2026-10-31', '2026-11-02'], '2026-11-02', 3, 3],
    [['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02'], '2027-01-02', 4, 4],
    [['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-11-10'], '2026-11-10', 1, 4],
  ])('%j con hoy %s → actual %i, mejor %i', (fechas, hoy, actual, mejor) => {
    expect(regresion(fechas, hoy)).toMatchObject({ actual, mejor });
  });
});
