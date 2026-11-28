// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { variacion } from '@/lib/reglas/admin';
import {
  construirCohortes,
  construirEmbudo,
  conversion,
  lunesDe,
  mayorCaida,
  PASOS_EMBUDO,
  retencionPromedio,
  semanasDesde,
  sumarSemanas,
  textoConversion,
  type CeldaCohorte,
  type FilaCohorte,
} from '@/lib/reglas/analiticaAdmin';

describe('conversion', () => {
  it('porcentaje redondeado de las registradas que registraron su primera sesión', () => {
    expect(conversion(10, 4)).toEqual({ tipo: 'porcentaje', porcentaje: 40 });
    expect(conversion(3, 2)).toEqual({ tipo: 'porcentaje', porcentaje: 67 });
    expect(conversion(3, 1)).toEqual({ tipo: 'porcentaje', porcentaje: 33 });
    expect(conversion(8, 0)).toEqual({ tipo: 'porcentaje', porcentaje: 0 });
    expect(conversion(5, 5)).toEqual({ tipo: 'porcentaje', porcentaje: 100 });
  });

  it('con 0 registradas no hay porcentaje, como variacion() con anterior 0 (nunca NaN ni infinito)', () => {
    expect(conversion(0, 0)).toEqual({ tipo: 'sin_registros' });
    expect(conversion(0, 3)).toEqual({ tipo: 'sin_registros' });
    // El mismo criterio que la variación: sin base, no hay porcentaje.
    expect(variacion(3, 0).tipo).not.toBe('cambio');
    expect(textoConversion(conversion(0, 0))).toBe('Sin registros');
    expect(textoConversion(conversion(10, 4))).toBe('40 %');
  });

  it('entradas imposibles no rompen nada: más conversiones que registros → 100 %; negativos, decimales o NaN → 0', () => {
    expect(conversion(4, 9)).toEqual({ tipo: 'porcentaje', porcentaje: 100 });
    expect(conversion(-2, 1)).toEqual({ tipo: 'sin_registros' });
    expect(conversion(10, -3)).toEqual({ tipo: 'porcentaje', porcentaje: 0 });
    expect(conversion(Number.NaN, 2)).toEqual({ tipo: 'sin_registros' });
    expect(conversion(4.9, 2.9)).toEqual({ tipo: 'porcentaje', porcentaje: 50 });
  });
});

describe('semanas de lunes a domingo', () => {
  it('lunesDe: cualquier día de la semana da su lunes, también cruzando mes y año', () => {
    // 2026-11-23 es lunes; 2026-11-29 es domingo.
    for (const dia of ['2026-11-23', '2026-11-25', '2026-11-28', '2026-11-29']) expect(lunesDe(dia)).toBe('2026-11-23');
    expect(lunesDe('2026-11-30')).toBe('2026-11-30');
    expect(lunesDe('2026-12-02')).toBe('2026-11-30');
    // 2027-01-01 es viernes: su lunes es del año anterior.
    expect(lunesDe('2027-01-01')).toBe('2026-12-28');
  });

  it('semanasDesde: 0 en la misma semana (de lunes a domingo), 1 la anterior, negativo si es futura', () => {
    expect(semanasDesde('2026-11-23', '2026-11-29')).toBe(0);
    expect(semanasDesde('2026-11-29', '2026-11-23')).toBe(0);
    // El domingo y el lunes siguiente son semanas distintas.
    expect(semanasDesde('2026-11-29', '2026-11-30')).toBe(1);
    expect(semanasDesde('2026-11-16', '2026-11-28')).toBe(1);
    expect(semanasDesde('2026-10-01', '2026-11-28')).toBe(8);
    expect(semanasDesde('2026-12-07', '2026-11-28')).toBe(-2);
    expect(semanasDesde('2026-12-25', '2027-01-04')).toBe(2);
  });

  it('sumarSemanas parte del lunes y acepta negativos', () => {
    expect(sumarSemanas('2026-11-28', 1)).toBe('2026-11-30');
    expect(sumarSemanas('2026-11-28', -1)).toBe('2026-11-16');
    expect(sumarSemanas('2026-11-28', 0)).toBe('2026-11-23');
  });
});

describe('construirCohortes', () => {
  const HOY = '2026-11-28'; // sábado; semana actual: lunes 2026-11-23

  it('las últimas N cohortes, de la más antigua a la de esta semana, cada una con N semanas', () => {
    const cohortes = construirCohortes([], HOY, 4);
    expect(cohortes.map((c) => c.cohorte)).toEqual(['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23']);
    for (const cohorte of cohortes) {
      expect(cohorte.celdas.map((c) => c.semana)).toEqual([1, 2, 3, 4]);
      expect(cohorte.registradas).toBe(0);
    }
    // Por defecto, 8 semanas.
    expect(construirCohortes([], HOY)).toHaveLength(8);
    expect(construirCohortes([], HOY)[0]!.celdas).toHaveLength(8);
  });

  it('sin celdas futuras: cada cohorte tiene tantas semanas con dato como semanas pasaron desde su registro', () => {
    const cohortes = construirCohortes([], HOY, 4);
    const conDato = (celdas: CeldaCohorte[]) => celdas.filter((c) => c.estado !== 'futura').length;
    expect(cohortes.map((c) => conDato(c.celdas))).toEqual([3, 2, 1, 0]);
    // La última semana con dato de cada cohorte es la actual: está en curso.
    expect(cohortes[0]!.celdas.map((c) => c.estado)).toEqual(['cerrada', 'cerrada', 'en_curso', 'futura']);
    expect(cohortes[3]!.celdas.every((c) => c.estado === 'futura')).toBe(true);
  });

  it('porcentaje de la cohorte activa en cada semana siguiente', () => {
    const filas: FilaCohorte[] = [
      { cohorte: '2026-11-02', registradas: 10, semana: 1, activas: 6 },
      { cohorte: '2026-11-02', registradas: 10, semana: 2, activas: 4 },
      { cohorte: '2026-11-02', registradas: 10, semana: 3, activas: 3 },
      { cohorte: '2026-11-09', registradas: 3, semana: 1, activas: 2 },
      { cohorte: '2026-11-16', registradas: 5, semana: null, activas: 0 },
    ];
    const [primera, segunda, tercera, actual] = construirCohortes(filas, HOY, 4);
    expect(primera!.registradas).toBe(10);
    expect(primera!.celdas.slice(0, 3)).toEqual([
      { semana: 1, estado: 'cerrada', activas: 6, porcentaje: 60 },
      { semana: 2, estado: 'cerrada', activas: 4, porcentaje: 40 },
      { semana: 3, estado: 'en_curso', activas: 3, porcentaje: 30 },
    ]);
    expect(segunda!.celdas.slice(0, 2)).toEqual([
      { semana: 1, estado: 'cerrada', activas: 2, porcentaje: 67 },
      { semana: 2, estado: 'en_curso', activas: 0, porcentaje: 0 },
    ]);
    // Cohorte sin actividad (semana null): 0 %, no un hueco.
    expect(tercera!.registradas).toBe(5);
    expect(tercera!.celdas[0]).toEqual({ semana: 1, estado: 'en_curso', activas: 0, porcentaje: 0 });
    // Cohorte que nadie formó: 0 personas, sin porcentaje.
    expect(actual!.registradas).toBe(0);
  });

  it('una cohorte de 0 personas no da porcentaje (ni 0 % ni NaN)', () => {
    const [primera] = construirCohortes([], HOY, 2);
    expect(primera!.celdas[0]).toEqual({ semana: 1, estado: 'en_curso', activas: 0, porcentaje: null });
  });

  it('la cohorte se normaliza a su lunes, se ignoran semanas fuera de rango y cohortes viejas, y activas ≤ registradas', () => {
    const cohortes = construirCohortes(
      [
        // Miércoles de la semana del 2 de noviembre: es esa cohorte.
        { cohorte: '2026-11-04', registradas: 4, semana: 1, activas: 2 },
        { cohorte: '2026-11-02', registradas: 4, semana: 0, activas: 4 },
        { cohorte: '2026-11-02', registradas: 4, semana: 9, activas: 4 },
        { cohorte: '2026-11-02', registradas: 4, semana: 2, activas: 7 },
        { cohorte: '2026-01-05', registradas: 99, semana: 1, activas: 50 },
      ],
      HOY,
      4,
    );
    expect(cohortes).toHaveLength(4);
    expect(cohortes.some((c) => c.cohorte === '2026-01-05')).toBe(false);
    const [primera] = cohortes;
    expect(primera!.cohorte).toBe('2026-11-02');
    expect(primera!.celdas[0]).toMatchObject({ activas: 2, porcentaje: 50 });
    expect(primera!.celdas[1]).toMatchObject({ activas: 4, porcentaje: 100 });
  });

  it('el domingo de una semana sigue siendo esa semana; el lunes siguiente la cierra', () => {
    const filas: FilaCohorte[] = [{ cohorte: '2026-11-16', registradas: 2, semana: 1, activas: 1 }];
    expect(construirCohortes(filas, '2026-11-29', 2).at(-2)!.celdas[0]).toMatchObject({ estado: 'en_curso' });
    expect(construirCohortes(filas, '2026-11-30', 3).at(-3)!.celdas[0]).toMatchObject({ estado: 'cerrada', porcentaje: 50 });
  });
});

describe('retencionPromedio', () => {
  it('ponderado por el tamaño de cada cohorte, solo con semanas cerradas; null sin datos', () => {
    const cohortes = construirCohortes(
      [
        { cohorte: '2026-11-02', registradas: 10, semana: 1, activas: 5 },
        { cohorte: '2026-11-09', registradas: 30, semana: 1, activas: 9 },
        { cohorte: '2026-11-09', registradas: 30, semana: 2, activas: 30 }, // semana en curso: no cuenta
      ],
      '2026-11-28',
      4,
    );
    // Semana 1: (5 + 9) / (10 + 30) = 35 %; semana 2: solo la primera cohorte la tiene cerrada → 0 de 10 = 0 %.
    expect(retencionPromedio(cohortes)).toEqual([35, 0, null, null]);
    expect(retencionPromedio([])).toEqual([]);
  });
});

describe('construirEmbudo', () => {
  const DATOS = { registradas: 20, confirmadas: 16, conPerfil: 12, primeraSesion: 6, dosSemanas: 3 };

  it('los cinco pasos en orden, con el porcentaje del total y del paso anterior', () => {
    const embudo = construirEmbudo(DATOS);
    expect(embudo.map((f) => f.paso)).toEqual([...PASOS_EMBUDO]);
    expect(embudo.map((f) => [f.cantidad, f.delTotal, f.delAnterior])).toEqual([
      [20, 100, null],
      [16, 80, 80],
      [12, 60, 75],
      [6, 30, 50],
      [3, 15, 50],
    ]);
    expect(embudo.map((f) => f.texto)).toEqual([
      'Se registraron',
      'Confirmaron el correo',
      'Completaron el perfil',
      'Registraron su primera sesión',
      'Entrenaron en 2 o más semanas',
    ]);
  });

  it('sin registros: cantidades en 0 y ningún porcentaje', () => {
    const embudo = construirEmbudo({ registradas: 0, confirmadas: 0, conPerfil: 0, primeraSesion: 0, dosSemanas: 0 });
    expect(embudo.every((f) => f.cantidad === 0 && f.delTotal === null && f.delAnterior === null)).toBe(true);
  });

  it('un paso anterior en 0 deja sin porcentaje al siguiente; un paso mayor que el anterior se limita a 100 %', () => {
    const embudo = construirEmbudo({ registradas: 10, confirmadas: 0, conPerfil: 0, primeraSesion: 2, dosSemanas: 3 });
    expect(embudo[2]!.delAnterior).toBeNull();
    expect(embudo[3]!.delAnterior).toBeNull();
    expect(embudo[4]!.delAnterior).toBe(100);
    expect(embudo[4]!.cantidad).toBe(3);
  });

  it('mayorCaida: el paso que más personas pierde (el primero si empatan); null si nadie se pierde', () => {
    expect(mayorCaida(construirEmbudo(DATOS))).toEqual({ paso: 'primeraSesion', perdidas: 6 });
    expect(mayorCaida(construirEmbudo({ registradas: 4, confirmadas: 2, conPerfil: 0, primeraSesion: 0, dosSemanas: 0 }))).toEqual({
      paso: 'confirmadas',
      perdidas: 2,
    });
    expect(mayorCaida(construirEmbudo({ registradas: 3, confirmadas: 3, conPerfil: 3, primeraSesion: 3, dosSemanas: 3 }))).toBeNull();
    expect(mayorCaida(construirEmbudo({ registradas: 0, confirmadas: 0, conPerfil: 0, primeraSesion: 0, dosSemanas: 0 }))).toBeNull();
  });
});
