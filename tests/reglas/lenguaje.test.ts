// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  interpretarSeries,
  normalizar,
  textoSerieInterpretada,
  type ContextoInterpretacion,
  type SerieInterpretada,
} from '@/lib/reglas/lenguaje';

const PESO: ContextoInterpretacion = { tipo: 'peso', pesoActualGramos: 40000, metodo: 'rectas' };
const CUERPO: ContextoInterpretacion = { tipo: 'calistenia', pesoActualGramos: null, metodo: 'rectas' };

const serie = (reps: number, kg: number | null, rir: number | null = null, tecnica: SerieInterpretada['tecnica'] = 'normal'): SerieInterpretada => ({
  reps,
  pesoGramos: kg === null ? null : Math.round(kg * 1000),
  rir,
  tecnica,
});
const iguales = (n: number, reps: number, kg: number | null, rir: number | null = null) => Array.from({ length: n }, () => serie(reps, kg, rir));

const series = (texto: string, contexto = PESO) => {
  const r = interpretarSeries(texto, contexto);
  if (!r.ok) throw new Error(`No interpretó "${texto}": ${r.error}`);
  return r.series;
};
const error = (texto: string, contexto = PESO) => {
  const r = interpretarSeries(texto, contexto);
  if (r.ok) throw new Error(`Debía fallar: "${texto}"`);
  return r.error;
};

describe('series por repeticiones ("NxM peso")', () => {
  it.each([
    ['3x10 40', iguales(3, 10, 40)],
    ['3 x 10 40', iguales(3, 10, 40)],
    ['3x10 con 40', iguales(3, 10, 40)],
    ['3 x 10 con 40', iguales(3, 10, 40)],
    ['3 de 10 con 40 kg', iguales(3, 10, 40)],
    ['3 de 10 con 40 kilos', iguales(3, 10, 40)],
    ['4×8 a 60', iguales(4, 8, 60)],
    ['4 × 8 a 60 kg', iguales(4, 8, 60)],
    ['4X8 @ 60', iguales(4, 8, 60)],
    ['3 series de 12 con 22,5', iguales(3, 12, 22.5)],
    ['3x10 62,5', iguales(3, 10, 62.5)],
    ['3x10 62.5 kg', iguales(3, 10, 62.5)],
    ['5x5 100 KG', iguales(5, 5, 100)],
    ['3x12 reps con 30', iguales(3, 12, 30)],
    ['Hoy hice 3x10 con 40', iguales(3, 10, 40)],
    ['2x15 0', iguales(2, 15, 0)],
  ])('"%s"', (texto, esperado) => {
    expect(series(texto)).toEqual(esperado);
  });
});

describe('repeticiones por serie', () => {
  it.each([
    ['60 kg: 10, 8, 7', [serie(10, 60), serie(8, 60), serie(7, 60)]],
    ['60kg 10 8 7', [serie(10, 60), serie(8, 60), serie(7, 60)]],
    ['62,5 kg: 8, 8, 6', [serie(8, 62.5), serie(8, 62.5), serie(6, 62.5)]],
    ['10, 8, 6 con 50', [serie(10, 50), serie(8, 50), serie(6, 50)]],
    ['10 8 6 con 50 kg', [serie(10, 50), serie(8, 50), serie(6, 50)]],
    ['12, 10 y 8 a 45', [serie(12, 45), serie(10, 45), serie(8, 45)]],
    ['10-9-8 @ 70', [serie(10, 70), serie(9, 70), serie(8, 70)]],
    ['10/9/8 con 70,5', [serie(10, 70.5), serie(9, 70.5), serie(8, 70.5)]],
  ])('"%s"', (texto, esperado) => {
    expect(series(texto)).toEqual(esperado);
  });
});

describe('sin peso', () => {
  it('con peso: usa el peso actual y lo avisa', () => {
    const r = interpretarSeries('8 7 6', PESO);
    expect(r).toEqual({ ok: true, series: [serie(8, 40), serie(7, 40), serie(6, 40)], avisos: ['Usé tu peso actual (40 kg) porque no escribiste el peso.'] });
    expect(series('3x10')).toEqual(iguales(3, 10, 40));
    expect(series('10, 10, 9 repeticiones')).toEqual([serie(10, 40), serie(10, 40), serie(9, 40)]);
  });

  it('con peso y sin peso actual: pide el peso', () => {
    expect(error('3x10', { tipo: 'peso', pesoActualGramos: null })).toMatch(/Escribe también el peso/);
    expect(error('8 8 8', { tipo: 'peso', pesoActualGramos: 0 })).toMatch(/Escribe también el peso/);
  });

  it('con tu cuerpo: sin peso; si se escribe uno, se deja fuera y se avisa', () => {
    expect(series('8 7 6', CUERPO)).toEqual([serie(8, null), serie(7, null), serie(6, null)]);
    expect(series('4x12', CUERPO)).toEqual(iguales(4, 12, null));
    const r = interpretarSeries('3x10 con 10 kg', CUERPO);
    expect(r).toMatchObject({ ok: true, series: iguales(3, 10, null), avisos: ['Con tu cuerpo no se anota peso: lo dejé fuera.'] });
  });
});

describe('RIR y al fallo', () => {
  it.each([
    ['3x10 40 rir 2', iguales(3, 10, 40, 2)],
    ['3x10 40 RIR2', iguales(3, 10, 40, 2)],
    ['3x10 con 40 con rir 3', iguales(3, 10, 40, 3)],
    ['rir 1: 3x8 60', iguales(3, 8, 60, 1)],
    ['3x10 40 la última al fallo', [serie(10, 40), serie(10, 40), serie(10, 40, 0)]],
    ['3x10 40 la ultima al fallo', [serie(10, 40), serie(10, 40), serie(10, 40, 0)]],
    ['10, 8, 6 con 50 al fallo', [serie(10, 50), serie(8, 50), serie(6, 50, 0)]],
    ['3x10 40 rir 2 y la última al fallo', [serie(10, 40, 2), serie(10, 40, 2), serie(10, 40, 0)]],
  ])('"%s"', (texto, esperado) => {
    expect(series(texto)).toEqual(esperado);
  });

  it('un RIR imposible es un error', () => {
    expect(error('3x10 40 rir 15')).toMatch(/El RIR debe estar entre 0 y 10/);
  });
});

describe('calentamiento (serie de aproximación)', () => {
  it.each([
    ['calentamiento 1x10 20, 3x10 40', [serie(10, 20, null, 'aproximacion'), ...iguales(3, 10, 40)]],
    ['calentamiento 1x10 20 y 3x10 40', [serie(10, 20, null, 'aproximacion'), ...iguales(3, 10, 40)]],
    ['Calentamiento: 2x8 con 20; 3x8 60', [serie(8, 20, null, 'aproximacion'), serie(8, 20, null, 'aproximacion'), ...iguales(3, 8, 60)]],
    ['calentamiento 1x10 20\n3x10 40 rir 2', [serie(10, 20, null, 'aproximacion'), ...iguales(3, 10, 40, 2)]],
    ['3x10 40, calentamiento 1x5 20', [...iguales(3, 10, 40), serie(5, 20, null, 'aproximacion')]],
  ])('"%s"', (texto, esperado) => {
    expect(series(texto)).toEqual(esperado);
  });

  it('el RIR y el fallo no se aplican al calentamiento', () => {
    expect(series('calentamiento 1x10 20, 2x8 60 al fallo')).toEqual([serie(10, 20, null, 'aproximacion'), serie(8, 60), serie(8, 60, 0)]);
  });

  it('solo calentamiento es un error', () => {
    expect(error('calentamiento 1x10 20')).toMatch(/Solo escribiste calentamiento/);
  });
});

describe('varios grupos', () => {
  it.each([
    ['4x8 a 60 y 2x6 a 70', [...iguales(4, 8, 60), ...iguales(2, 6, 70)]],
    ['3x10 40; 2x8 45', [...iguales(3, 10, 40), ...iguales(2, 8, 45)]],
    ['2x10 40, 1x8 45', [...iguales(2, 10, 40), serie(8, 45)]],
  ])('"%s"', (texto, esperado) => {
    expect(series(texto)).toEqual(esperado);
  });
});

describe('errores claros', () => {
  it('libras: pide kilos', () => {
    expect(error('3x10 90 lb')).toMatch(/kilos \(kg\)/);
    expect(error('3x10 con 90 libras')).toMatch(/kilos \(kg\)/);
    expect(error('3x10 90 lbs')).toMatch(/kilos \(kg\)/);
  });

  it('lo que no entiende: dice qué y da 3 ejemplos', () => {
    const mensaje = error('hice pecho y espalda');
    expect(mensaje).toMatch(/^No entendí/);
    expect(mensaje).toContain('3x10 40');
    expect(mensaje).toContain('60 kg: 10, 8, 7');
    expect(error('')).toMatch(/Escribe tus series/);
  });

  it('valores imposibles con los mismos topes del servidor', () => {
    expect(error('3x0 40')).toMatch(/entre 1 y 1000/);
    expect(error('1x1001 40')).toMatch(/entre 1 y 1000/);
    expect(error('3x10 2001')).toMatch(/entre 0 y 2000 kg/);
    expect(error('25x5 40')).toMatch(/demasiadas series/);
  });
});

describe('normalización y texto de la vista previa', () => {
  it('sin mayúsculas ni tildes, × como x y kilos como kg', () => {
    expect(normalizar('  3 × 10 CON 40 Kilos  ')).toBe('3 x 10 con 40 kg');
    expect(normalizar('La Última AL FALLO')).toBe('la ultima al fallo');
  });

  it('chips legibles', () => {
    expect(textoSerieInterpretada(serie(10, 62.5, 2))).toBe('10 reps × 62,5 kg · RIR 2');
    expect(textoSerieInterpretada(serie(8, null))).toBe('8 reps');
    expect(textoSerieInterpretada(serie(10, 20, null, 'aproximacion'))).toBe('Calentamiento: 10 reps × 20 kg');
  });
});
