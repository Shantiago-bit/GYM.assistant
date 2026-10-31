// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { esFechaFutura, esFechaValida, hoyBogota } from '@/lib/reglas/fechas';
import { validarSesion } from '@/lib/reglas/sesion';
import { esperarCodigo } from './ayudas';

describe('validarSesion', () => {
  it('T-07: rechaza una sesión sin series', () => {
    esperarCodigo(() => validarSesion([], 'peso'), 'DATOS_INVALIDOS');
  });

  it('T-08: rechaza repeticiones negativas', () => {
    esperarCodigo(() => validarSesion([{ reps: -1, pesoGramos: 50000 }], 'peso'), 'DATOS_INVALIDOS');
  });

  it('T-09: rechaza una serie de peso sin peso', () => {
    esperarCodigo(() => validarSesion([{ reps: 10 }], 'peso'), 'DATOS_INVALIDOS');
  });

  it('T-10: rechaza una serie de calistenia con peso', () => {
    esperarCodigo(
      () => validarSesion([{ reps: 10, pesoGramos: 50000 }], 'calistenia'),
      'DATOS_INVALIDOS',
    );
  });

  it('T-11: acepta una serie de peso válida', () => {
    expect(() => validarSesion([{ reps: 10, pesoGramos: 50000 }], 'peso')).not.toThrow();
  });
});

describe('fechas', () => {
  it('T-22: una fecha posterior a hoy es futura', () => {
    expect(esFechaFutura('2030-01-02', '2030-01-01')).toBe(true);
  });

  it('T-23: hoy no es una fecha futura', () => {
    expect(esFechaFutura('2030-01-01', '2030-01-01')).toBe(false);
  });

  it('hoyBogota usa UTC-5 aunque en UTC ya sea el día siguiente', () => {
    expect(hoyBogota(new Date('2030-01-02T03:00:00Z'))).toBe('2030-01-01');
  });

  it('esFechaValida rechaza fechas que no existen', () => {
    expect(esFechaValida('2030-02-30')).toBe(false);
    expect(esFechaValida('2030-02-28')).toBe(true);
  });
});
