// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { restarDias } from '@/lib/reglas/fechas';
import { indicadorProgreso, mejorSerie, tendenciaDeSesiones } from '@/lib/reglas/tendencia';

const serie = (reps: number, pesoGramos: number | null = null) => ({ reps, pesoGramos });

describe('mejorSerie', () => {
  it('prefiere el mayor peso aunque tenga menos repeticiones', () => {
    expect(mejorSerie([serie(12, 50000), serie(8, 52500)])).toEqual(serie(8, 52500));
  });

  it('con el mismo peso prefiere más repeticiones', () => {
    expect(mejorSerie([serie(8, 50000), serie(10, 50000)])).toEqual(serie(10, 50000));
  });

  it('en calistenia compara repeticiones', () => {
    expect(mejorSerie([serie(8), serie(11), serie(9)])).toEqual(serie(11));
  });

  it('sin series devuelve null', () => {
    expect(mejorSerie([])).toBeNull();
  });
});

describe('indicadorProgreso', () => {
  it('distingue mejora, baja y estable', () => {
    expect(indicadorProgreso(serie(10, 50000), serie(8, 52500))).toBe('mejora');
    expect(indicadorProgreso(serie(10, 50000), serie(9, 50000))).toBe('baja');
    expect(indicadorProgreso(serie(10), serie(10))).toBe('estable');
  });
});

describe('tendenciaDeSesiones', () => {
  it('compara cada sesión con la anterior', () => {
    const puntos = tendenciaDeSesiones([
      { fecha: '2030-01-01', series: [serie(10, 50000)] },
      { fecha: '2030-01-03', series: [serie(13, 50000)] },
      { fecha: '2030-01-05', series: [serie(12, 50000)] },
    ]);

    expect(puntos.map((punto) => punto.indicador)).toEqual([null, 'mejora', 'baja']);
  });
});

describe('restarDias', () => {
  it('cruza el cambio de mes', () => {
    expect(restarDias('2030-03-01', 1)).toBe('2030-02-28');
  });
});
