import { z } from 'zod';
import { esFechaFutura, esFechaValida, hoyBogota } from '@/lib/reglas/fechas';

// Topes de las columnas SMALLINT e INTEGER, para responder 400 y no un error interno de Postgres.
const REPS_MAXIMAS = 1000;
const PESO_MAXIMO_KG = 2000;

const entero = z.number().int().min(1).max(REPS_MAXIMAS);
const pesoKg = z.number().min(0).max(PESO_MAXIMO_KG);

const fechaTexto = z.string().refine(esFechaValida, 'La fecha no es válida.');

export const esquemaEjercicio = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio.').max(120),
  tipo: z.enum(['peso', 'calistenia']),
  pesoRefKg: pesoKg.optional(),
  nivel: z.string().trim().max(80).optional(),
  rangoMin: entero.optional(),
  rangoMax: entero.optional(),
});

export const esquemaSerie = z.object({
  reps: z.number().int().min(0).max(REPS_MAXIMAS),
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

export const esquemaFiltros = z.object({
  incluirArchivados: z
    .enum(['true', 'false'])
    .optional()
    .transform((valor) => valor === 'true'),
});

export type EntradaEjercicio = z.infer<typeof esquemaEjercicio>;
export type EntradaSerie = z.infer<typeof esquemaSerie>;
export type EntradaSesion = z.infer<typeof esquemaSesion>;
