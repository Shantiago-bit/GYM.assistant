import { z } from 'zod';
import { CHAT_MAX_CARACTERES, CHAT_MAX_MENSAJES } from '@/lib/config/gym';
import { ESTADOS_RECORRIDO, IDS_RECORRIDO } from '@/lib/guia/recorridos';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
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

const metodo = z.enum(['rectas', 'principal_descarga', 'piramide_invertida', 'piramide_ascendente', 'cluster']);

export const esquemaEjercicio = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio.')
    .max(120, 'El nombre admite hasta 120 caracteres.'),
  tipo: z.enum(['peso', 'calistenia']),
  enfoque: z.enum(['fuerza', 'hipertrofia', 'resistencia']).optional(),
  metodo: metodo.optional(),
  pesoRefKg: pesoKg.optional(),
  nivel: z.string().trim().max(80, 'El nivel admite hasta 80 caracteres.').optional(),
  rangoMin: entero.optional(),
  rangoMax: entero.optional(),
});

export const esquemaEnfoque = z
  .object({
    enfoque: z.enum(['fuerza', 'hipertrofia', 'resistencia']),
    metodo: metodo.optional(),
    rangoMin: entero,
    rangoMax: entero,
  })
  .refine(({ rangoMin, rangoMax }) => rangoMin <= rangoMax, {
    message: 'El rango mínimo no puede ser mayor que el máximo.',
    path: ['rangoMin'],
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
  rir: numero
    .int('El RIR debe ser un número entero.')
    .min(0, 'El RIR no puede ser negativo.')
    .max(10, 'El RIR debe ser menor o igual a 10.')
    .optional(),
  tipoSerie: z.enum(['normal', 'aproximacion', 'amrap', 'rest_pause', 'myo_reps', 'drop_set']).optional(),
  extras: z
    .array(
      z.object({
        reps: numero
          .int('Las mini series deben ser números enteros.')
          .min(1, 'Cada mini serie necesita al menos una repetición.')
          .max(REPS_MAXIMAS, `Las repeticiones deben ser menores o iguales a ${REPS_MAXIMAS}.`),
        pesoKg: pesoKg.optional(),
      }),
    )
    .max(6, 'Una serie admite hasta 6 mini series.')
    .optional(),
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

// Datos personales del perfil (registro paso 1, completar y editar). El apodo vacío se guarda como nulo.
export const GENEROS = ['hombre', 'mujer', 'otro', 'prefiero_no_decir'] as const;

const nombrePersona = z
  .string({ required_error: 'Escribe tu nombre.' })
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres.')
  .max(60, 'El nombre admite hasta 60 caracteres.');

const apodo = z
  .string()
  .trim()
  .max(30, 'El apodo admite hasta 30 caracteres.')
  .optional()
  .transform((valor) => (valor ? valor : undefined))
  .refine((valor) => valor === undefined || valor.length >= 2, 'El apodo debe tener al menos 2 caracteres.');

const genero = z.enum(GENEROS, { errorMap: () => ({ message: 'Elige una opción de género.' }) });

export const esquemaDatosPersonales = z.object({
  nombre: nombrePersona,
  apodo,
  fechaNacimiento: fechaTexto
    .refine((fecha) => !esFechaFutura(fecha, hoyBogota()), 'La fecha de nacimiento no puede ser futura.')
    .refine((fecha) => fecha > '1900-01-01', 'Revisa la fecha de nacimiento.'),
  genero,
});

export const esquemaEditarPerfil = z.object({ nombre: nombrePersona, apodo, genero });

export const esquemaRegistroCuenta = z.object({
  perfil: esquemaDatosPersonales,
  email: z.string().trim().toLowerCase().email('Introduce un correo válido.'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(72, 'La contraseña admite hasta 72 caracteres.'),
  correoTutor: z.string().trim().toLowerCase().email('Introduce un correo válido para tu tutor.').optional(),
});

// Valida y, si falla, responde 400 con el primer mensaje (más claro que el genérico).
export function validarCon<T>(esquema: z.ZodType<T, z.ZodTypeDef, unknown>, datos: unknown): T {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', resultado.error.issues[0]?.message ?? 'Revisa los datos.');
  }
  return resultado.data;
}

// Para eliminar un ejercicio hay que escribir su nombre; la comparación ignora mayúsculas y espacios extremos.
export const esquemaEliminarEjercicio = z.object({
  confirmacion: z.string({ required_error: 'Escribe el nombre del ejercicio para confirmar.' }).max(200),
});

export const esquemaFiltros = z.object({
  incluirArchivados: z
    .enum(['true', 'false'])
    .optional()
    .transform((valor) => valor === 'true'),
});

// Acciones de la guía interactiva. El paso tiene un tope amplio: los recorridos tienen pocos pasos.
export const esquemaAccionGuia = z.discriminatedUnion(
  'accion',
  [
    z.object({ accion: z.literal('oferta_vista') }),
    z.object({
      accion: z.literal('recorrido'),
      recorrido: z.enum(IDS_RECORRIDO),
      estado: z.enum(ESTADOS_RECORRIDO),
      paso: z.number().int().min(0).max(50),
    }),
    z.object({ accion: z.literal('reiniciar') }),
  ],
  { errorMap: () => ({ message: 'La acción de la guía no es válida.' }) },
);

export type AccionGuia = z.infer<typeof esquemaAccionGuia>;

// Las respuestas del asistente pueden ser largas (rutinas); los mensajes de la persona, no.
const LARGO_MAXIMO_RESPUESTA = 20000;

export const esquemaChat = z.object({
  mensajes: z
    .array(
      z
        .object({
          rol: z.enum(['usuario', 'asistente']),
          texto: z.string().trim().min(1, 'El mensaje está vacío.').max(LARGO_MAXIMO_RESPUESTA),
        })
        .refine(
          ({ rol, texto }) => rol === 'asistente' || texto.length <= CHAT_MAX_CARACTERES,
          `El mensaje puede tener hasta ${CHAT_MAX_CARACTERES} caracteres.`,
        ),
    )
    .min(1)
    .max(CHAT_MAX_MENSAJES)
    .refine((mensajes) => mensajes.at(-1)?.rol === 'usuario', 'El último mensaje debe ser de la persona.'),
});

export type EntradaEjercicio = z.infer<typeof esquemaEjercicio>;
export type EntradaSerie = z.infer<typeof esquemaSerie>;
export type EntradaSesion = z.infer<typeof esquemaSesion>;
