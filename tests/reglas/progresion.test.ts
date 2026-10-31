// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { estadoTrasSesion, recomendarSiguiente, type Recomendacion } from '@/lib/reglas/progresion';

function peso(repsPorSerie: number[]) {
  return recomendarSiguiente({
    tipo: 'peso',
    rango: [8, 12],
    pesoActualGramos: 50000,
    metaRepsActual: 12,
    repsPorSerie,
  });
}

function calistenia(repsPorSerie: number[]) {
  return recomendarSiguiente({
    tipo: 'calistenia',
    rango: [8, 15],
    pesoActualGramos: null,
    metaRepsActual: 15,
    repsPorSerie,
  });
}

describe('recomendarSiguiente en peso', () => {
  it('T-12: todas superan el tope, sube a 52,5 kg y la meta vuelve a 8', () => {
    const r = peso([13, 13, 13]);
    expect(r.accion).toBe('subir_peso');
    expect(r.pesoSugeridoGramos).toBe(52500);
    expect(r.metaRepsSugerida).toBe(8);
    expect(r.mensaje).toContain('52,5 kg');
  });

  it('T-13: todas alcanzan el mínimo, sube la meta', () => {
    const r = peso([10, 10, 9]);
    expect(r.accion).toBe('subir_reps');
    expect(r.pesoSugeridoGramos).toBe(50000);
    expect(r.metaRepsSugerida).toBe(12);
  });

  it('T-14: no todas superan el tope, no sube peso', () => {
    const r = peso([13, 12, 13]);
    expect(r.accion).toBe('subir_reps');
    expect(r.pesoSugeridoGramos).toBe(50000);
    expect(r.metaRepsSugerida).toBe(12);
  });

  it('T-15: justo en el mínimo, sube la meta', () => {
    const r = peso([8, 8, 8]);
    expect(r.accion).toBe('subir_reps');
    expect(r.pesoSugeridoGramos).toBe(50000);
    expect(r.metaRepsSugerida).toBe(12);
  });

  it('T-16: una serie bajo el mínimo, mantiene', () => {
    const r = peso([12, 12, 6]);
    expect(r.accion).toBe('mantener');
    expect(r.pesoSugeridoGramos).toBe(50000);
    expect(r.metaRepsSugerida).toBe(12);
  });

  it('T-17: 12 reps no superan el tope de 12', () => {
    const r = peso([12, 12, 12]);
    expect(r.accion).toBe('subir_reps');
    expect(r.pesoSugeridoGramos).toBe(50000);
    expect(r.metaRepsSugerida).toBe(12);
  });

  it('T-21: una sola serie que supera el tope sube el peso', () => {
    const r = peso([13]);
    expect(r.accion).toBe('subir_peso');
    expect(r.pesoSugeridoGramos).toBe(52500);
    expect(r.metaRepsSugerida).toBe(8);
  });

  it('sin series mantiene, no sube peso', () => {
    expect(peso([]).accion).toBe('mantener');
  });
});

describe('recomendarSiguiente en calistenia', () => {
  it('T-18: todas superan el tope, sugiere una variante más difícil', () => {
    const r = calistenia([16, 16, 16]);
    expect(r.accion).toBe('subir_variante');
    expect(r.pesoSugeridoGramos).toBeNull();
    expect(r.metaRepsSugerida).toBe(8);
  });

  it('T-19: todas alcanzan el mínimo, sube la meta', () => {
    const r = calistenia([12, 11, 10]);
    expect(r.accion).toBe('subir_reps');
    expect(r.pesoSugeridoGramos).toBeNull();
    expect(r.metaRepsSugerida).toBe(15);
  });

  it('T-20: una serie bajo el mínimo, mantiene', () => {
    const r = calistenia([8, 7, 9]);
    expect(r.accion).toBe('mantener');
    expect(r.pesoSugeridoGramos).toBeNull();
  });
});

describe('estadoTrasSesion', () => {
  const subirPeso: Recomendacion = {
    accion: 'subir_peso',
    pesoSugeridoGramos: 52500,
    metaRepsSugerida: 8,
    mensaje: '',
  };

  it('aplica la recomendación si todas las series usan el peso sugerido', () => {
    expect(
      estadoTrasSesion({
        tipo: 'peso',
        pesoActualGramos: 50000,
        metaRepsActual: 12,
        recomendacion: subirPeso,
        pesosDeLaSesion: [52500, 52500],
      }),
    ).toEqual({ pesoRefGramos: 52500, metaReps: 8 });
  });

  it('conserva el estado si la sesión no usa el peso sugerido', () => {
    expect(
      estadoTrasSesion({
        tipo: 'peso',
        pesoActualGramos: 50000,
        metaRepsActual: 12,
        recomendacion: subirPeso,
        pesosDeLaSesion: [50000, 52500],
      }),
    ).toEqual({ pesoRefGramos: 50000, metaReps: 12 });
  });

  it('en calistenia actualiza solo la meta', () => {
    expect(
      estadoTrasSesion({
        tipo: 'calistenia',
        pesoActualGramos: null,
        metaRepsActual: 15,
        recomendacion: {
          accion: 'subir_variante',
          pesoSugeridoGramos: null,
          metaRepsSugerida: 8,
          mensaje: '',
        },
        pesosDeLaSesion: [null],
      }),
    ).toEqual({ pesoRefGramos: null, metaReps: 8 });
  });
});
