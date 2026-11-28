// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  adopcion,
  completarDiasChrono,
  completarMesesChrono,
  inicioSerieMeses,
  llegoAlLimite,
  porcentajeDe,
  promedioPorPersona,
  resumirChrono,
  textoPorcentaje,
} from '@/lib/reglas/chronoAdmin';

describe('porcentajes y promedios', () => {
  it('porcentajeDe: entero, como mucho 100, null sin base', () => {
    expect(porcentajeDe(1, 3)).toBe(33);
    expect(porcentajeDe(2, 3)).toBe(67);
    expect(porcentajeDe(0, 5)).toBe(0);
    expect(porcentajeDe(7, 5)).toBe(100);
    expect(porcentajeDe(3, 0)).toBeNull();
    expect(porcentajeDe(Number.NaN, 4)).toBe(0);
    expect(porcentajeDe(2, -1)).toBeNull();
    expect(textoPorcentaje(null)).toBe('Sin datos');
    expect(textoPorcentaje(null, 'Sin cuentas')).toBe('Sin cuentas');
    expect(textoPorcentaje(45)).toBe('45 %');
  });

  it('promedioPorPersona: un decimal, 0 si nadie lo usó', () => {
    expect(promedioPorPersona(10, 3)).toBe(3.3);
    expect(promedioPorPersona(12, 4)).toBe(3);
    expect(promedioPorPersona(5, 0)).toBe(0);
    expect(promedioPorPersona(0, 0)).toBe(0);
  });

  it('adopción: % de las registradas que usó CHRONO alguna vez; null sin cuentas', () => {
    expect(adopcion(3, 12)).toBe(25);
    expect(adopcion(0, 12)).toBe(0);
    expect(adopcion(0, 0)).toBeNull();
  });

  it('llegó al límite: mensajes ≥ límite; con límite 0 (apagado) nunca', () => {
    expect(llegoAlLimite(40, 40)).toBe(true);
    expect(llegoAlLimite(41, 40)).toBe(true); // el límite bajó después de ese día
    expect(llegoAlLimite(39, 40)).toBe(false);
    expect(llegoAlLimite(0, 0)).toBe(false);
    expect(llegoAlLimite(5, 0)).toBe(false);
  });
});

describe('series', () => {
  it('30 días hasta hoy, del más viejo al más reciente, cruzando el cambio de mes, con los vacíos en 0', () => {
    const dias = completarDiasChrono([{ dia: '2026-11-01', mensajes: 9, personas: 2, enLimite: 1 }], '2026-11-28');
    expect(dias).toHaveLength(30);
    expect(dias[0]!.dia).toBe('2026-10-30');
    expect(dias.at(-1)!.dia).toBe('2026-11-28');
    expect(dias.find((d) => d.dia === '2026-11-01')).toEqual({ dia: '2026-11-01', mensajes: 9, personas: 2, enLimite: 1 });
    expect(dias.find((d) => d.dia === '2026-11-02')).toEqual({ dia: '2026-11-02', mensajes: 0, personas: 0, enLimite: 0 });
  });

  it('12 meses hasta el actual, con % de las activas que usaron CHRONO y el promedio por persona', () => {
    const meses = completarMesesChrono(
      [
        { mes: '2026-11', mensajes: 30, personas: 4, activas: 8, activasConChrono: 3 },
        { mes: '2026-10', mensajes: 5, personas: 2, activas: 0, activasConChrono: 0 },
      ],
      '2026-11-28',
    );
    expect(meses).toHaveLength(12);
    expect(meses[0]!.mes).toBe('2025-12');
    expect(meses.at(-1)).toEqual({ mes: '2026-11', mensajes: 30, personas: 4, activas: 8, activasConChrono: 3, porcentajeActivas: 38, promedio: 7.5 });
    // Personas que usaron CHRONO sin entrenar ese mes: sin activas no hay porcentaje.
    expect(meses.at(-2)).toMatchObject({ porcentajeActivas: null, promedio: 2.5 });
    expect(meses[0]).toMatchObject({ mensajes: 0, personas: 0, porcentajeActivas: null, promedio: 0 });
  });

  it('inicioSerieMeses: el día 1 del mes más antiguo, cruzando el año', () => {
    expect(inicioSerieMeses('2026-11-28')).toBe('2025-12-01');
    expect(inicioSerieMeses('2026-01-15', 3)).toBe('2025-11-01');
  });
});

describe('resumirChrono', () => {
  it('adopción, promedio de 30 días y % de quienes usaron CHRONO que llegaron al límite', () => {
    expect(
      resumirChrono({ registradas: 20, usaronAlgunaVez: 5, personas30: 4, mensajes30: 50, personasEnLimite30: 1, diasEnLimite30: 3 }),
    ).toEqual({
      registradas: 20,
      usaronAlgunaVez: 5,
      personas30: 4,
      mensajes30: 50,
      personasEnLimite30: 1,
      diasEnLimite30: 3,
      adopcion: 25,
      promedio30: 12.5,
      porcentajeEnLimite30: 25,
    });
  });

  it('sin uso: todo en 0 o sin porcentaje, nunca NaN', () => {
    const resumen = resumirChrono({ registradas: 0, usaronAlgunaVez: 0, personas30: 0, mensajes30: 0, personasEnLimite30: 0, diasEnLimite30: 0 });
    expect(resumen).toMatchObject({ adopcion: null, promedio30: 0, porcentajeEnLimite30: null });
  });
});
