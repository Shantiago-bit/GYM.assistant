import { describe, expect, it } from 'vitest';
import {
  buildExerciseFromTest,
  calculateNextProgression,
  type ExerciseType,
} from './progression';

describe('progression engine', () => {
  it('crea un ejercicio con base real a partir de la prueba inicial', () => {
    const exercise = buildExerciseFromTest({
      name: 'Press de banca',
      type: 'peso',
      weight: 60,
      repetitions: 8,
      margin: 4,
      increment: 2.5,
    });

    expect(exercise.name).toBe('Press de banca');
    expect(exercise.type).toBe<'peso'>('peso');
    expect(exercise.weightActual).toBe(60);
    expect(exercise.objectiveRepetitions).toBe(8);
    expect(exercise.repetitionsMin).toBe(8);
    expect(exercise.repetitionsMax).toBe(12);
  });

  it('sube de peso cuando todas las series alcanzan el máximo del rango', () => {
    const nextPlan = calculateNextProgression({
      type: 'peso',
      weightActual: 60,
      incrementPeso: 2.5,
      repetitionsMin: 8,
      repetitionsMax: 12,
      objectiveRepetitions: 8,
      series: [
        { repetitions: 12, weight: 60 },
        { repetitions: 12, weight: 60 },
        { repetitions: 12, weight: 60 },
      ],
    });

    expect(nextPlan.weightActual).toBe(62.5);
    expect(nextPlan.objectiveRepetitions).toBe(8);
    expect(nextPlan.message).toContain('subir peso');
  });

  it('sube el objetivo de repeticiones cuando todas las series cumplen pero no llegan al máximo', () => {
    const nextPlan = calculateNextProgression({
      type: 'peso',
      weightActual: 60,
      incrementPeso: 2.5,
      repetitionsMin: 8,
      repetitionsMax: 12,
      objectiveRepetitions: 8,
      series: [
        { repetitions: 9, weight: 60 },
        { repetitions: 10, weight: 60 },
        { repetitions: 9, weight: 60 },
      ],
    });

    expect(nextPlan.objectiveRepetitions).toBe(9);
    expect(nextPlan.weightActual).toBe(60);
    expect(nextPlan.message).toContain('repeticiones');
  });

  it('mantiene el mismo peso y objetivo si alguna serie falla', () => {
    const nextPlan = calculateNextProgression({
      type: 'peso',
      weightActual: 60,
      incrementPeso: 2.5,
      repetitionsMin: 8,
      repetitionsMax: 12,
      objectiveRepetitions: 10,
      series: [
        { repetitions: 10, weight: 60 },
        { repetitions: 7, weight: 60 },
        { repetitions: 10, weight: 60 },
      ],
    });

    expect(nextPlan.weightActual).toBe(60);
    expect(nextPlan.objectiveRepetitions).toBe(10);
    expect(nextPlan.message).toContain('mantener');
  });

  it('avisa cuando en calistenia se llega al máximo del rango', () => {
    const nextPlan = calculateNextProgression({
      type: 'calistenia',
      weightActual: null,
      incrementPeso: null,
      repetitionsMin: 12,
      repetitionsMax: 16,
      objectiveRepetitions: 12,
      series: [
        { repetitions: 16, weight: null },
        { repetitions: 16, weight: null },
        { repetitions: 16, weight: null },
      ],
    });

    expect(nextPlan.weightActual).toBeNull();
    expect(nextPlan.message).toContain('variante');
  });

  it('respetar el tipo de ejercicio para TypeScript', () => {
    const type: ExerciseType = 'calistenia';
    expect(type).toBe('calistenia');
  });
});
