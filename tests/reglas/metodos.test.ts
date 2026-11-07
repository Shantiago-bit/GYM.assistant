// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { indicesClave, metodoValido, planDeSesion, reducirPeso } from '@/lib/reglas/metodos';
import { detectarLogro, estadoTrasSesion, recomendarSiguiente } from '@/lib/reglas/progresion';

const base = { tipo: 'peso' as const, rango: [3, 5] as [number, number], metaReps: 5, pesoGramos: 100000, cantidad: 3 };

describe('planDeSesion', () => {
  it('series rectas: mismo peso en todas', () => {
    const plan = planDeSesion({ ...base, metodo: 'rectas' });
    expect(plan.map((serie) => serie.pesoGramos)).toEqual([100000, 100000, 100000]);
    expect(plan.every((serie) => serie.clave)).toBe(true);
  });

  it('principal + descarga: la primera pesada y el resto −10 %', () => {
    const plan = planDeSesion({ ...base, metodo: 'principal_descarga' });
    expect(plan.map((serie) => serie.pesoGramos)).toEqual([100000, 90000, 90000]);
    expect(plan.map((serie) => serie.etiqueta)).toEqual(['Principal', 'Descarga', 'Descarga']);
    expect(plan.map((serie) => serie.clave)).toEqual([true, false, false]);
  });

  it('pirámide invertida: −10 % y +2 reps por serie', () => {
    const plan = planDeSesion({ ...base, metodo: 'piramide_invertida' });
    expect(plan.map((serie) => serie.pesoGramos)).toEqual([100000, 90000, 80000]);
    expect(plan.map((serie) => [serie.repsMin, serie.repsMax])).toEqual([
      [3, 5],
      [5, 7],
      [7, 9],
    ]);
  });

  it('pirámide ascendente: sube hasta la más pesada al final', () => {
    const plan = planDeSesion({ ...base, metodo: 'piramide_ascendente' });
    expect(plan.map((serie) => serie.pesoGramos)).toEqual([80000, 90000, 100000]);
    expect(plan.map((serie) => serie.clave)).toEqual([false, false, true]);
  });

  it('redondea los pesos derivados a 0,5 kg hacia abajo', () => {
    expect(reducirPeso(47500, 0.1)).toBe(42500);
    expect(reducirPeso(7500, 0.1)).toBe(6500);
  });

  it('en calistenia el plan no lleva peso', () => {
    const plan = planDeSesion({ ...base, tipo: 'calistenia', pesoGramos: null, metodo: 'cluster' });
    expect(plan.every((serie) => serie.pesoGramos === null)).toBe(true);
  });
});

describe('métodos y progresión', () => {
  it('las series clave dependen del método', () => {
    expect(indicesClave('principal_descarga', 4)).toEqual([0]);
    expect(indicesClave('piramide_ascendente', 4)).toEqual([3]);
    expect(indicesClave('rectas', 3)).toEqual([0, 1, 2]);
  });

  it('calistenia solo admite series rectas y cluster', () => {
    expect(metodoValido('calistenia', 'cluster')).toBe(true);
    expect(metodoValido('calistenia', 'piramide_invertida')).toBe(false);
    expect(metodoValido('peso', 'piramide_invertida')).toBe(true);
  });

  it('principal + descarga sube con la serie principal aunque las descargas no lleguen al tope', () => {
    const r = recomendarSiguiente({
      tipo: 'peso',
      rango: [3, 5],
      pesoActualGramos: 100000,
      metaRepsActual: 5,
      repsPorSerie: [5, 4, 4],
      metodo: 'principal_descarga',
    });
    expect(r.accion).toBe('subir_peso');
    expect(r.pesoSugeridoGramos).toBe(105000);
    expect(r.mensaje).toContain('serie principal');
  });

  it('pirámide ascendente decide con la última serie', () => {
    const r = recomendarSiguiente({
      tipo: 'peso',
      rango: [3, 5],
      pesoActualGramos: 100000,
      metaRepsActual: 5,
      repsPorSerie: [3, 3, 4],
      metodo: 'piramide_ascendente',
    });
    expect(r.accion).toBe('subir_reps');
  });

  it('una serie clave hecha con menos peso que el de referencia no cuenta para subir', () => {
    // Cambio a pirámide ascendente: la última serie de la sesión anterior era una descarga.
    const r = recomendarSiguiente({
      tipo: 'peso',
      rango: [3, 5],
      pesoActualGramos: 105000,
      metaRepsActual: 3,
      repsPorSerie: [3, 5, 5],
      pesosPorSerie: [105000, 94500, 94500],
      metodo: 'piramide_ascendente',
    });
    expect(r.accion).toBe('subir_reps');
    expect(r.pesoSugeridoGramos).toBe(105000);
  });

  it('llegar al tope con el peso de referencia o más sí cuenta', () => {
    const r = recomendarSiguiente({
      tipo: 'peso',
      rango: [8, 12],
      pesoActualGramos: 7500,
      metaRepsActual: 12,
      repsPorSerie: [12, 12, 12],
      pesosPorSerie: [8000, 7500, 7500],
    });
    expect(r.accion).toBe('subir_peso');
  });

  it('series rectas sigue exigiendo todas las series', () => {
    const r = recomendarSiguiente({
      tipo: 'peso',
      rango: [3, 5],
      pesoActualGramos: 100000,
      metaRepsActual: 5,
      repsPorSerie: [5, 4, 4],
    });
    expect(r.accion).toBe('subir_reps');
  });

  it('el estado se actualiza si la serie clave usó el peso sugerido, aunque las descargas pesen menos', () => {
    expect(
      estadoTrasSesion({
        tipo: 'peso',
        pesoActualGramos: 100000,
        metaRepsActual: 5,
        recomendacion: { accion: 'subir_peso', pesoSugeridoGramos: 105000, metaRepsSugerida: 3, mensaje: '' },
        pesosDeLaSesion: [105000, 94500, 94500],
        metodo: 'principal_descarga',
      }),
    ).toEqual({ pesoRefGramos: 105000, metaReps: 3 });
  });

  it('el logro se basa en la serie clave', () => {
    const recomendacion = recomendarSiguiente({
      tipo: 'peso',
      rango: [3, 5],
      pesoActualGramos: 100000,
      metaRepsActual: 5,
      repsPorSerie: [5, 4, 4],
      metodo: 'principal_descarga',
    });
    const logro = detectarLogro({
      nombre: 'Banco plano',
      tipo: 'peso',
      rango: [3, 5],
      pesoRefGramos: 100000,
      series: [
        { reps: 5, pesoGramos: 100000 },
        { reps: 4, pesoGramos: 90000 },
        { reps: 4, pesoGramos: 90000 },
      ],
      recomendacion,
      metodo: 'principal_descarga',
    });
    expect(logro?.pesoSiguienteGramos).toBe(105000);
    expect(logro?.metodo).toBe('principal_descarga');
  });
});
