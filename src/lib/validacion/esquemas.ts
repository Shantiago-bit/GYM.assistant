import { z } from 'zod';
import { esFechaFutura, esFechaValida, hoyBogota } from '@/lib/reglas/fechas';

// Topes de las columnas SMALLINT e INTEGER, para responder 400 y no un error interno de Postgres.
const REPS_MAXIMAS = 1000;
const PESO_MAXIMO_KG = 2000;

const numero = z.number({
  required_error: 'Este dato es obligatorio.',
  invalid_type_error: 'Debe ser un número.',
});
const entero = numero
  .int('Debe ser un número entero.')
  .min(1, 'Debe ser mayor o igual a 1.')
  .max(REPS_MAXIMAS, `Debe ser menor o igual a ${REPS_MAXIMAS}.`);
const pesoKg = numero
  .min(0, 'El peso no puede ser negativo.')
  .max(PESO_MAXIMO_KG, `El peso debe ser menor o igual a ${PESO_MAXIMO_KG} kg.`);

const fechaTexto = z.string().refine(esFechaValida, 'La fecha no es válida.');

export const esquemaEjercicio = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio.')
    .max(120, 'El nombre admite hasta 120 caracteres.'),
  tipo: z.enum(['peso', 'calistenia']),
  pesoRefKg: pesoKg.optional(),
  nivel: z.string().trim().max(80, 'El nivel admite hasta 80 caracteres.').optional(),
  rangoMin: entero.optional(),
  rangoMax: entero.optional(),
});

export const esquemaNivel = z.object({
  nivel: z
    .string()
    .trim()
    .min(1, 'Escribe el nivel o variante.')
    .max(80, 'El nivel admite hasta 80 caracteres.'),
});

export const esquemaSerie = z.object({
  reps: numero
    .int('Las repeticiones deben ser un número entero.')
    .min(0, 'Las repeticiones no pueden ser negativas.')
    .max(REPS_MAXIMAS, `Las repeticiones deben ser menores o iguales a ${REPS_MAXIMAS}.`),
  pesoKg: pesoKg.optional(),
});

export const esquemaSeries = z.array(esquemaSerie).min(1, 'Agrega al menos una serie.');

export const esquemaPrueba = z.object({ series: esquemaSeries });

export const esquemaSesion = z.object({
  fecha: fechaTexto
    .refine((fecha) => !esFechaFutura(fecha, hoyBogota()), 'La fecha no puede ser futura.')
    .optional(),
  series: esquemaSeries,
});

export const esquemaEntrenamiento = z.object({
  fecha: esquemaSesion.shape.fecha,
  ejercicios: z
    .array(z.object({ ejercicioId: z.string().min(1), series: esquemaSeries }))
    .min(1, 'Selecciona al menos un ejercicio.')
    .refine(
      (ejercicios) => new Set(ejercicios.map((e) => e.ejercicioId)).size === ejercicios.length,
      'Cada ejercicio puede aparecer una sola vez.',
    ),
});

export const esquemaResumen = z
  .object({ desde: fechaTexto, hasta: fechaTexto })
  .refine(({ desde, hasta }) => desde <= hasta, 'La fecha inicial no puede ser posterior a la final.');

export const esquemaFiltros = z.object({
  incluirArchivados: z
    .enum(['true', 'false'])
    .optional()
    .transform((valor) => valor === 'true'),
});

export type EntradaEjercicio = z.infer<typeof esquemaEjercicio>;
export type EntradaSerie = z.infer<typeof esquemaSerie>;
export type EntradaSesion = z.infer<typeof esquemaSesion>;
