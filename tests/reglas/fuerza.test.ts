// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { estimar1RM, mejor1RM, serie1RM } from '@/lib/reglas/fuerza';

describe('estimar1RM', () => {
  it('aplica Epley: 100 kg × 3 ≈ 110 kg', () => {
    expect(estimar1RM({ reps: 3, pesoGramos: 100000 })).toBe(110000);
  });

  it('una repetición es el propio peso', () => {
    expect(estimar1RM({ reps: 1, pesoGramos: 120000 })).toBe(120000);
  });

  it('con RIR cuenta las repeticiones que la serie permitía', () => {
    // 3 reps con 2 en reserva equivalen a 5 al fallo.
    expect(estimar1RM({ reps: 3, pesoGramos: 100000, rir: 2 })).toBe(116667);
  });

  it('acota las repeticiones a 12 para no inflar la estimación', () => {
    expect(estimar1RM({ reps: 20, pesoGramos: 50000 })).toBe(estimar1RM({ reps: 12, pesoGramos: 50000 }));
  });

  it('sin peso o sin repeticiones no hay estimación', () => {
    expect(estimar1RM({ reps: 10, pesoGramos: null })).toBeNull();
    expect(estimar1RM({ reps: 0, pesoGramos: 50000 })).toBeNull();
  });
});

describe('mejor1RM y serie1RM', () => {
  it('toma la mejor serie de la sesión', () => {
    expect(
      mejor1RM([
        { reps: 12, pesoGramos: 7500 },
        { reps: 8, pesoGramos: 10000 },
      ]),
    ).toBe(12667);
  });

  it('ordena los puntos de la sesión más antigua a la más reciente y omite las vacías', () => {
    const puntos = serie1RM([
      { fecha: '2026-11-07', series: [{ reps: 3, pesoGramos: 100000 }] },
      { fecha: '2026-11-01', series: [{ reps: 3, pesoGramos: 95000 }] },
      { fecha: '2026-11-04', series: [{ reps: 10, pesoGramos: null }] },
    ]);
    expect(puntos.map((punto) => punto.fecha)).toEqual(['2026-11-01', '2026-11-07']);
  });
});
