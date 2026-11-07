// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  detectarLogro,
  estadoTrasSesion,
  incrementoPeso,
  pesoDeDescarga,
  recomendarSiguiente,
  type Recomendacion,
} from '@/lib/reglas/progresion';

function peso(repsPorSerie: number[], pesoActualGramos = 50000) {
  return recomendarSiguiente({
    tipo: 'peso',
    rango: [8, 12],
    pesoActualGramos,
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

describe('incrementoPeso', () => {
  it('sube 2,5 kg por debajo de 50 kg', () => {
    expect(incrementoPeso(7500)).toBe(2500);
    expect(incrementoPeso(47500)).toBe(2500);
  });

  it('sube 5 kg desde 50 kg', () => {
    expect(incrementoPeso(50000)).toBe(5000);
    expect(incrementoPeso(100000)).toBe(5000);
  });
});

describe('recomendarSiguiente en peso', () => {
  it('T-12: todas superan el tope, sube a 55 kg y la meta vuelve a 8', () => {
    const r = peso([13, 13, 13]);
    expect(r.accion).toBe('subir_peso');
    expect(r.pesoSugeridoGramos).toBe(55000);
    expect(r.metaRepsSugerida).toBe(8);
    expect(r.mensaje).toContain('55 kg');
  });

  it('T-13: todas alcanzan el mínimo, sube la meta', () => {
    const r = peso([10, 10, 9]);
    expect(r.accion).toBe('subir_reps');
    expect(r.pesoSugeridoGramos).toBe(50000);
    expect(r.metaRepsSugerida).toBe(12);
  });

  it('T-14: no todas llegan al tope, no sube peso', () => {
    const r = peso([13, 11, 13]);
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

  it('T-17: 12 reps en todas las series cumplen el tope de 12 y suben el peso', () => {
    const r = peso([12, 12, 12]);
    expect(r.accion).toBe('subir_peso');
    expect(r.pesoSugeridoGramos).toBe(55000);
    expect(r.metaRepsSugerida).toBe(8);
  });

  it('T-17b: 12 reps con 7,5 kg sugieren 10 kg y volver a 8', () => {
    const r = peso([12, 12, 12], 7500);
    expect(r.accion).toBe('subir_peso');
    expect(r.pesoSugeridoGramos).toBe(10000);
    expect(r.metaRepsSugerida).toBe(8);
    expect(r.mensaje).toContain('10 kg');
  });

  it('T-21: una sola serie en el tope sube el peso', () => {
    const r = peso([12]);
    expect(r.accion).toBe('subir_peso');
    expect(r.pesoSugeridoGramos).toBe(55000);
    expect(r.metaRepsSugerida).toBe(8);
  });

  it('sin series mantiene, no sube peso', () => {
    expect(peso([]).accion).toBe('mantener');
  });
});

describe('recomendarSiguiente con RIR y descarga', () => {
  const base = {
    tipo: 'peso' as const,
    rango: [8, 12] as [number, number],
    pesoActualGramos: 40000,
    metaRepsActual: 12,
  };

  it('salto doble: tope en todas las series con RIR 3 o más', () => {
    const r = recomendarSiguiente({ ...base, repsPorSerie: [12, 12, 12], rirPorSerie: [3, 4, 3] });
    expect(r.accion).toBe('subir_peso');
    expect(r.pesoSugeridoGramos).toBe(45000);
    expect(r.mensaje).toContain('doble');
  });

  it('salto normal si alguna serie tenía menos de 3 en reserva', () => {
    const r = recomendarSiguiente({ ...base, repsPorSerie: [12, 12, 12], rirPorSerie: [3, 3, 1] });
    expect(r.pesoSugeridoGramos).toBe(42500);
  });

  it('salto normal si falta el RIR de alguna serie', () => {
    const r = recomendarSiguiente({ ...base, repsPorSerie: [12, 12, 12], rirPorSerie: [4, null, 4] });
    expect(r.pesoSugeridoGramos).toBe(42500);
  });

  it('descarga: dos sesiones seguidas bajo el mínimo bajan un 10 %', () => {
    const r = recomendarSiguiente({ ...base, repsPorSerie: [8, 7, 6], repsSesionAnterior: [8, 6, 6] });
    expect(r.accion).toBe('bajar_peso');
    expect(r.pesoSugeridoGramos).toBe(36000);
    expect(r.metaRepsSugerida).toBe(8);
  });

  it('una sola sesión bajo el mínimo mantiene', () => {
    const r = recomendarSiguiente({ ...base, repsPorSerie: [8, 7, 6], repsSesionAnterior: [9, 8, 8] });
    expect(r.accion).toBe('mantener');
  });

  it('la descarga redondea a 0,5 kg hacia abajo', () => {
    expect(pesoDeDescarga(7500)).toBe(6500);
    expect(pesoDeDescarga(100000)).toBe(90000);
  });
});

describe('recomendarSiguiente en calistenia', () => {
  it('T-18: todas llegan al tope, sugiere una variante más difícil', () => {
    const r = calistenia([15, 15, 16]);
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

describe('detectarLogro', () => {
  const series = [12, 12, 12].map((reps) => ({ reps, pesoGramos: 7500 }));

  it('resume la sesión y sugiere el peso siguiente con el mínimo del rango', () => {
    const logro = detectarLogro({
      nombre: 'Press banca',
      tipo: 'peso',
      rango: [8, 12],
      pesoRefGramos: 7500,
      series,
      recomendacion: peso([12, 12, 12], 7500),
    });

    expect(logro).toEqual({
      nombre: 'Press banca',
      tipo: 'peso',
      rango: [8, 12],
      series,
      volumenGramos: 270000,
      pesoSiguienteGramos: 10000,
      incrementoGramos: 2500,
      metaRepsSiguiente: 8,
      saltoDoble: false,
    });
  });

  it('marca el salto doble si sobraban 3 o más repeticiones en todas las series', () => {
    const conReserva = [12, 12, 12].map((reps) => ({ reps, pesoGramos: 7500, rir: 3 }));
    const logro = detectarLogro({
      nombre: 'Press banca',
      tipo: 'peso',
      rango: [8, 12],
      pesoRefGramos: 7500,
      series: conReserva,
      recomendacion: recomendarSiguiente({
        tipo: 'peso',
        rango: [8, 12],
        pesoActualGramos: 7500,
        metaRepsActual: 12,
        repsPorSerie: [12, 12, 12],
        rirPorSerie: [3, 3, 3],
      }),
    });

    expect(logro?.saltoDoble).toBe(true);
    expect(logro?.pesoSiguienteGramos).toBe(12500);
    expect(logro?.incrementoGramos).toBe(5000);
  });

  it('no hay logro si alguna serie no llega al tope', () => {
    expect(
      detectarLogro({
        nombre: 'Press banca',
        tipo: 'peso',
        rango: [8, 12],
        pesoRefGramos: 7500,
        series: [12, 11, 12].map((reps) => ({ reps, pesoGramos: 7500 })),
        recomendacion: peso([12, 11, 12], 7500),
      }),
    ).toBeNull();
  });

  it('en calistenia sugiere una variante sin peso', () => {
    const logro = detectarLogro({
      nombre: 'Flexiones',
      tipo: 'calistenia',
      rango: [8, 15],
      pesoRefGramos: null,
      series: [{ reps: 15 }, { reps: 15 }],
      recomendacion: calistenia([15, 15]),
    });

    expect(logro?.pesoSiguienteGramos).toBeNull();
    expect(logro?.volumenGramos).toBeNull();
    expect(logro?.metaRepsSiguiente).toBe(8);
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
