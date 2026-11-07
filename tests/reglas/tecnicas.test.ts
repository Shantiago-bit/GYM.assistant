// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { mejor1RM } from '@/lib/reglas/fuerza';
import { detectarLogro, listoParaSubir, recomendarSiguiente } from '@/lib/reglas/progresion';
import { validarSesion } from '@/lib/reglas/sesion';
import { leerListaNumeros, repsTotales, seriesEfectivas, volumenSerie } from '@/lib/reglas/tecnicas';
import { esperarCodigo } from './ayudas';

describe('lectura de mini series', () => {
  it('acepta espacios, + y comas en repeticiones', () => {
    expect(leerListaNumeros('3 2 2', false)).toEqual([3, 2, 2]);
    expect(leerListaNumeros('3+2+2', false)).toEqual([3, 2, 2]);
    expect(leerListaNumeros('3, 2, 2', false)).toEqual([3, 2, 2]);
  });

  it('en pesos la coma es decimal', () => {
    expect(leerListaNumeros('40,5 30', true)).toEqual([40.5, 30]);
  });

  it('rechaza texto o decimales en repeticiones', () => {
    expect(leerListaNumeros('3 dos', false)).toBeNull();
    expect(leerListaNumeros('2.5', false)).toBeNull();
  });
});

describe('volumen y totales', () => {
  it('rest-pause: las mini series usan el peso de la serie', () => {
    const serie = { reps: 10, pesoGramos: 50000, extras: [{ reps: 3 }, { reps: 2 }] };
    expect(volumenSerie(serie)).toBe(750000);
    expect(repsTotales(serie)).toBe(15);
  });

  it('drop set: cada bajada usa su peso', () => {
    const serie = { reps: 8, pesoGramos: 50000, extras: [{ reps: 6, pesoGramos: 40000 }, { reps: 5, pesoGramos: 30000 }] };
    expect(volumenSerie(serie)).toBe(400000 + 240000 + 150000);
  });

  it('las aproximaciones quedan fuera', () => {
    expect(seriesEfectivas([{ tipoSerie: 'aproximacion' as const }, { tipoSerie: 'normal' as const }, {}])).toHaveLength(2);
  });
});

describe('validarSesion con técnicas', () => {
  it('exige al menos una serie de trabajo', () => {
    esperarCodigo(
      () => validarSesion([{ reps: 10, pesoGramos: 20000, tipoSerie: 'aproximacion' }], 'peso'),
      'DATOS_INVALIDOS',
    );
  });

  it('solo rest-pause, myo-reps y drop set llevan mini series', () => {
    esperarCodigo(
      () => validarSesion([{ reps: 10, pesoGramos: 50000, tipoSerie: 'amrap', extras: [{ reps: 2 }] }], 'peso'),
      'DATOS_INVALIDOS',
    );
  });

  it('el drop set con peso necesita el peso de cada bajada', () => {
    esperarCodigo(
      () => validarSesion([{ reps: 8, pesoGramos: 50000, tipoSerie: 'drop_set', extras: [{ reps: 6 }] }], 'peso'),
      'DATOS_INVALIDOS',
    );
  });

  it('acepta un rest-pause válido', () => {
    expect(() =>
      validarSesion([{ reps: 10, pesoGramos: 50000, tipoSerie: 'rest_pause', extras: [{ reps: 3 }, { reps: 2 }] }], 'peso'),
    ).not.toThrow();
  });
});

describe('técnicas y progresión', () => {
  it('la meta se mide con la serie principal: 10 + 3 + 2 no cumple un rango 8–12', () => {
    const r = recomendarSiguiente({
      tipo: 'peso',
      rango: [8, 12],
      pesoActualGramos: 50000,
      metaRepsActual: 12,
      repsPorSerie: [10],
    });
    expect(r.accion).toBe('subir_reps');
  });

  it('listo para subir ignora la aproximación', () => {
    expect(
      listoParaSubir({
        tipo: 'peso',
        metodo: 'principal_descarga',
        rango: [3, 5],
        pesoRefGramos: 100000,
        series: [
          { reps: 8, pesoGramos: 50000, tipoSerie: 'aproximacion' },
          { reps: 5, pesoGramos: 100000, tipoSerie: 'normal' },
          { reps: 4, pesoGramos: 90000, tipoSerie: 'normal' },
        ],
      }),
    ).toBe(true);
  });

  it('el logro suma las mini series al volumen y no muestra la aproximación', () => {
    const logro = detectarLogro({
      nombre: 'Curl',
      tipo: 'peso',
      rango: [8, 12],
      pesoRefGramos: 10000,
      series: [
        { reps: 10, pesoGramos: 5000, tipoSerie: 'aproximacion' },
        { reps: 12, pesoGramos: 10000, tipoSerie: 'rest_pause', extras: [{ reps: 3 }] },
      ],
      recomendacion: recomendarSiguiente({
        tipo: 'peso',
        rango: [8, 12],
        pesoActualGramos: 10000,
        metaRepsActual: 12,
        repsPorSerie: [12],
      }),
    });
    expect(logro?.series).toHaveLength(1);
    expect(logro?.volumenGramos).toBe(150000);
  });

  it('el 1RM ignora la aproximación', () => {
    expect(
      mejor1RM([
        { reps: 10, pesoGramos: 120000, tipoSerie: 'aproximacion' },
        { reps: 3, pesoGramos: 100000 },
      ]),
    ).toBe(110000);
  });
});
