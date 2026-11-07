// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { rangoPorTipo, validarEjercicio } from '@/lib/reglas/ejercicio';
import { esperarCodigo } from './ayudas';

describe('rangoPorTipo', () => {
  it('T-01: devuelve el rango de cada tipo', () => {
    expect(rangoPorTipo('peso')).toEqual([8, 12]);
    expect(rangoPorTipo('calistenia')).toEqual([8, 15]);
  });

  it('cada enfoque sugiere su rango', () => {
    expect(rangoPorTipo('peso', 'fuerza')).toEqual([3, 5]);
    expect(rangoPorTipo('peso', 'hipertrofia')).toEqual([8, 12]);
    expect(rangoPorTipo('peso', 'resistencia')).toEqual([15, 20]);
    expect(rangoPorTipo('calistenia', 'fuerza')).toEqual([3, 6]);
  });
});

describe('validarEjercicio', () => {
  it('T-02: rechaza un nombre vacío', () => {
    esperarCodigo(
      () => validarEjercicio({ nombre: ' ', tipo: 'peso', pesoRefGramos: 50000 }),
      'DATOS_INVALIDOS',
    );
  });

  it('T-03: rechaza un ejercicio de peso sin peso de referencia', () => {
    esperarCodigo(() => validarEjercicio({ nombre: 'Press', tipo: 'peso' }), 'DATOS_INVALIDOS');
  });

  it('T-04: rechaza un ejercicio de calistenia con peso', () => {
    esperarCodigo(
      () => validarEjercicio({ nombre: 'Dominadas', tipo: 'calistenia', pesoRefGramos: 50000 }),
      'DATOS_INVALIDOS',
    );
  });

  it('T-05: rechaza un rango invertido', () => {
    esperarCodigo(
      () =>
        validarEjercicio({
          nombre: 'Press',
          tipo: 'peso',
          pesoRefGramos: 50000,
          rangoMin: 12,
          rangoMax: 8,
        }),
      'DATOS_INVALIDOS',
    );
  });

  it('T-06: acepta un ejercicio de peso válido', () => {
    expect(() =>
      validarEjercicio({
        nombre: 'Press',
        tipo: 'peso',
        pesoRefGramos: 50000,
        rangoMin: 8,
        rangoMax: 12,
      }),
    ).not.toThrow();
  });
});
