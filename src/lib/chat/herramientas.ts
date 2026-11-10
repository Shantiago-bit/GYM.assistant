import type { ChatCompletionTool } from 'groq-sdk/resources/chat/completions';
import { z } from 'zod';
import { CHAT_MAX_SESIONES } from '@/lib/config/gym';
import { crearEjercicio, listarEjercicios, obtenerEjercicio, obtenerResumen } from '@/lib/dataService';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { esquemaEjercicio, esquemaResumen } from '@/lib/validacion/esquemas';

// Tres herramientas de consulta y una de escritura (crear_ejercicio).
// La cuenta sale siempre de la sesión, nunca de lo que pida el modelo.
export const HERRAMIENTAS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'listar_ejercicios',
      description:
        'Lista los ejercicios de la persona con su tipo, enfoque, método, rango de repeticiones, peso de referencia, ' +
        'nivel (calistenia), número de sesiones, fecha de la última sesión y si ya está lista para subir peso. ' +
        'Úsala antes de hablar de sus ejercicios o de armar una rutina.',
      parameters: {
        type: 'object',
        properties: {
          incluir_archivados: {
            type: 'boolean',
            description: 'true para incluir también los ejercicios archivados.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ver_ejercicio',
      description:
        `Detalle de un ejercicio: datos, últimas ${CHAT_MAX_SESIONES} sesiones con sus series (reps, peso, RIR y técnica), ` +
        'la recomendación de la app para la próxima sesión y el plan por serie. El id sale de listar_ejercicios.',
      parameters: {
        type: 'object',
        properties: {
          ejercicio_id: { type: 'string', description: 'Id del ejercicio, tal como lo devuelve listar_ejercicios.' },
        },
        required: ['ejercicio_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'resumen_periodo',
      description:
        'Resumen del entrenamiento entre dos fechas: total de sesiones y, por ejercicio, la mejor serie al inicio y al ' +
        'final del periodo y si mejoró, se mantuvo o empeoró.',
      parameters: {
        type: 'object',
        properties: {
          desde: { type: 'string', description: 'Fecha inicial, AAAA-MM-DD.' },
          hasta: { type: 'string', description: 'Fecha final, AAAA-MM-DD.' },
        },
        required: ['desde', 'hasta'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'crear_ejercicio',
      description:
        'Crea un ejercicio nuevo en la cuenta de la persona. Úsala solo después de que la persona haya confirmado ' +
        'explícitamente el nombre y los datos del ejercicio. Los campos opcionales que no se envíen toman los valores ' +
        'por defecto de la app (enfoque hipertrofia, método rectas y el rango típico del enfoque).',
      parameters: {
        type: 'object',
        properties: {
          nombre: { type: 'string', description: 'Nombre del ejercicio, hasta 120 caracteres.' },
          tipo: { type: 'string', enum: ['peso', 'calistenia'], description: 'peso (con carga externa) o calistenia.' },
          enfoque: { type: 'string', enum: ['fuerza', 'hipertrofia', 'resistencia'] },
          metodo: {
            type: 'string',
            enum: ['rectas', 'principal_descarga', 'piramide_invertida', 'piramide_ascendente', 'cluster'],
            description: 'Método de series. Los distintos de rectas solo valen para ejercicios de peso.',
          },
          peso_ref_kg: { type: 'number', description: 'Peso de referencia en kilos (solo ejercicios de peso).' },
          nivel: { type: 'string', description: 'Variante o nivel actual (solo calistenia), hasta 80 caracteres.' },
          rango_min: { type: 'integer', description: 'Mínimo del rango de repeticiones.' },
          rango_max: { type: 'integer', description: 'Máximo del rango de repeticiones.' },
        },
        required: ['nombre', 'tipo'],
      },
    },
  },
];

const ENTRADAS = {
  listar_ejercicios: z.object({ incluir_archivados: z.boolean().optional() }),
  ver_ejercicio: z.object({ ejercicio_id: z.string().min(1) }),
  resumen_periodo: esquemaResumen,
  // Los nombres en snake_case del modelo se pasan al mismo esquema que valida el formulario de la app.
  crear_ejercicio: z
    .object({
      nombre: z.unknown(),
      tipo: z.unknown(),
      enfoque: z.unknown().optional(),
      metodo: z.unknown().optional(),
      peso_ref_kg: z.unknown().optional(),
      nivel: z.unknown().optional(),
      rango_min: z.unknown().optional(),
      rango_max: z.unknown().optional(),
    })
    .transform(({ peso_ref_kg, rango_min, rango_max, ...resto }) => ({
      ...resto,
      pesoRefKg: peso_ref_kg ?? undefined,
      rangoMin: rango_min ?? undefined,
      rangoMax: rango_max ?? undefined,
    }))
    .pipe(esquemaEjercicio),
};

// Prepara los datos para el modelo: pesos en kilos (pesoGramos: 52500 -> pesoKg: 52.5) y sin campos vacíos,
// porque el plan gratuito de Groq limita los tokens por minuto.
export function compactar(valor: unknown): unknown {
  if (Array.isArray(valor)) {
    return valor.map(compactar);
  }
  if (typeof valor !== 'object' || valor === null) {
    return valor;
  }
  return Object.fromEntries(
    Object.entries(valor)
      .filter(([, dato]) => dato !== null && dato !== undefined)
      .map(([clave, dato]) =>
        clave.endsWith('Gramos')
          ? [`${clave.slice(0, -'Gramos'.length)}Kg`, typeof dato === 'number' ? dato / 1000 : dato]
          : [clave, compactar(dato)],
      ),
  );
}

async function consultarHerramienta(usuarioId: string, nombre: string, entrada: unknown): Promise<unknown> {
  switch (nombre) {
    case 'listar_ejercicios': {
      const { incluir_archivados } = ENTRADAS.listar_ejercicios.parse(entrada);
      return listarEjercicios(usuarioId, { incluirArchivados: incluir_archivados ?? false });
    }
    case 'ver_ejercicio': {
      const { ejercicio_id } = ENTRADAS.ver_ejercicio.parse(entrada);
      const detalle = await obtenerEjercicio(usuarioId, ejercicio_id);
      return { ...detalle, sesiones: detalle.sesiones.slice(0, CHAT_MAX_SESIONES) };
    }
    case 'resumen_periodo': {
      const { desde, hasta } = ENTRADAS.resumen_periodo.parse(entrada);
      return obtenerResumen(usuarioId, desde, hasta);
    }
    case 'crear_ejercicio': {
      const datos = ENTRADAS.crear_ejercicio.parse(entrada);
      const { id } = await crearEjercicio(usuarioId, datos);
      return { creado: true, id, nombre: datos.nombre };
    }
    default:
      throw new ErrorDeNegocio('DATOS_INVALIDOS', `No existe la herramienta ${nombre}.`);
  }
}

export async function ejecutarHerramienta(
  usuarioId: string,
  nombre: string,
  entrada: unknown,
): Promise<{ contenido: string; esError: boolean }> {
  try {
    const resultado = await consultarHerramienta(usuarioId, nombre, entrada);
    return { contenido: JSON.stringify(compactar(resultado)), esError: false };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { contenido: `Datos de entrada inválidos: ${error.issues[0]?.message ?? 'revisa los campos'}.`, esError: true };
    }
    if (error instanceof ErrorDeNegocio) {
      return { contenido: error.message, esError: true };
    }
    throw error;
  }
}
