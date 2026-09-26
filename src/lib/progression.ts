export type ExerciseType = 'peso' | 'calistenia';

export interface ExerciseSeries {
  repetitions: number;
  weight: number | null;
}

export interface ExerciseRecord {
  id: string;
  name: string;
  type: ExerciseType;
  repetitionsMin: number;
  repetitionsMax: number;
  objectiveRepetitions: number;
  marginRepetitions: number;
  weightActual: number | null;
  incrementPeso: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BuildExerciseInput {
  name: string;
  type: ExerciseType;
  weight?: number;
  repetitions?: number;
  margin?: number;
  increment?: number;
}

export interface ProgressionInput {
  type: ExerciseType;
  weightActual: number | null;
  incrementPeso: number | null;
  repetitionsMin: number;
  repetitionsMax: number;
  objectiveRepetitions: number;
  series: ExerciseSeries[];
}

export interface ProgressionResult {
  weightActual: number | null;
  objectiveRepetitions: number;
  message: string;
}

export function buildExerciseFromTest({
  name,
  type,
  weight,
  repetitions,
  margin = 4,
  increment,
}: BuildExerciseInput): ExerciseRecord {
  const safeWeight = typeof weight === 'number' ? weight : null;
  const safeRepetitions = typeof repetitions === 'number' ? repetitions : 0;
  const baseId = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

  if (type === 'peso') {
    const min = Math.max(1, safeRepetitions || 1);
    return {
      id: baseId,
      name,
      type,
      repetitionsMin: min,
      repetitionsMax: min + margin,
      objectiveRepetitions: min,
      marginRepetitions: margin,
      weightActual: safeWeight,
      incrementPeso: typeof increment === 'number' ? increment : 2.5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    id: baseId,
    name,
    type,
    repetitionsMin: safeRepetitions || 0,
    repetitionsMax: (safeRepetitions || 0) + margin,
    objectiveRepetitions: safeRepetitions || 0,
    marginRepetitions: margin,
    weightActual: null,
    incrementPeso: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function calculateNextProgression({
  type,
  weightActual,
  incrementPeso,
  repetitionsMin,
  repetitionsMax,
  objectiveRepetitions,
  series,
}: ProgressionInput): ProgressionResult {
  const validSeries = series.filter((entry) => Number.isFinite(entry.repetitions));

  if (validSeries.length === 0) {
    return {
      weightActual,
      objectiveRepetitions,
      message: 'No hay series registradas para evaluar la progresión.',
    };
  }

  const allReachedTarget = validSeries.every(
    (entry) => entry.repetitions >= objectiveRepetitions,
  );
  const allReachedMax = validSeries.every((entry) => entry.repetitions >= repetitionsMax);
  const hasBelowTarget = validSeries.some((entry) => entry.repetitions < objectiveRepetitions);

  if (type === 'peso') {
    if (allReachedMax && typeof weightActual === 'number' && typeof incrementPeso === 'number') {
      return {
        weightActual: Number((weightActual + incrementPeso).toFixed(2)),
        objectiveRepetitions: repetitionsMin,
        message: 'Se debe subir peso y reiniciar el objetivo porque todas las series alcanzaron el máximo.',
      };
    }

    if (allReachedTarget && !allReachedMax) {
      return {
        weightActual,
        objectiveRepetitions: Math.min(objectiveRepetitions + 1, repetitionsMax),
        message: 'Se mantiene el mismo peso y aumenta el objetivo de repeticiones.',
      };
    }

    if (hasBelowTarget) {
      return {
        weightActual,
        objectiveRepetitions,
        message: 'Se debe mantener la carga y el objetivo porque alguna serie no alcanzó la meta.',
      };
    }
  }

  if (type === 'calistenia') {
    if (allReachedMax) {
      return {
        weightActual: null,
        objectiveRepetitions: repetitionsMax,
        message: 'Se llegó al máximo del rango en calistenia. Considera una variante más difícil.',
      };
    }

    if (allReachedTarget && !allReachedMax) {
      return {
        weightActual: null,
        objectiveRepetitions: Math.min(objectiveRepetitions + 1, repetitionsMax),
        message: 'Se aumenta la meta de repeticiones manteniendo la misma variante.',
      };
    }

    if (hasBelowTarget) {
      return {
        weightActual: null,
        objectiveRepetitions,
        message: 'Se mantiene la variante actual porque alguna serie quedó por debajo del objetivo.',
      };
    }
  }

  return {
    weightActual,
    objectiveRepetitions,
    message: 'La progresión se mantiene estable.',
  };
}
