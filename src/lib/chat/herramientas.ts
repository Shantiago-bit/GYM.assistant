import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { CHAT_MAX_SESIONES } from '@/lib/config/gym';
import { listarEjercicios, obtenerEjercicio, obtenerResumen } from '@/lib/dataService';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { esquemaResumen } from '@/lib/validacion/esquemas';

// Herramientas de solo lectura. La cuenta sale siempre de la sesión, nunca de lo que pida el modelo.
export const HERRAMIENTAS: Anthropic.Beta.BetaTool[] = [
  {
    name: 'listar_ejercicios',
    description:
      'Lista los ejercicios de la persona con su tipo, enfoque, método, rango de repeticiones, peso de referencia, ' +
      'nivel (calistenia), número de sesiones, fecha de la última sesión y si ya está lista para subir peso. ' +
      'Úsala antes de hablar de sus ejercicios o de armar una rutina.',
    input_schema: {
      type: 'object',
      properties: {
        incluir_archivados: {
          type: 'boolean',
          description: 'true para incluir también los ejercicios archivados.',
        },
      },
      required: [],
    },
    eager_input_streaming: true,
  },
  {
    name: 'ver_ejercicio',
    description:
      `Detalle de un ejercicio: datos, últimas ${CHAT_MAX_SESIONES} sesiones con sus series (reps, peso, RIR y técnica), ` +
      'la recomendación de la app para la próxima sesión y el plan por serie. El id sale de listar_ejercicios.',
    input_schema: {
      type: 'object',
      properties: {
        ejercicio_id: { type: 'string', description: 'Id del ejercicio, tal como lo devuelve listar_ejercicios.' },
      },
      required: ['ejercicio_id'],
    },
    eager_input_streaming: true,
  },
  {
    name: 'resumen_periodo',
    description:
      'Resumen del entrenamiento entre dos fechas: total de sesiones y, por ejercicio, la mejor serie al inicio y al ' +
      'final del periodo y si mejoró, se mantuvo o empeoró.',
    input_schema: {
      type: 'object',
      properties: {
        desde: { type: 'string', description: 'Fecha inicial, AAAA-MM-DD.' },
        hasta: { type: 'string', description: 'Fecha final, AAAA-MM-DD.' },
      },
      required: ['desde', 'hasta'],
    },
    eager_input_streaming: true,
  },
];

const ENTRADAS = {
  listar_ejercicios: z.object({ incluir_archivados: z.boolean().optional() }),
  ver_ejercicio: z.object({ ejercicio_id: z.string().min(1) }),
  resumen_periodo: esquemaResumen,
};

// El asistente lee kilos: cada campo en gramos se convierte (pesoGramos: 52500 -> pesoKg: 52.5).
export function aKilos(valor: unknown): unknown {
  if (Array.isArray(valor)) {
    return valor.map(aKilos);
  }
  if (typeof valor !== 'object' || valor === null) {
    return valor;
  }
  return Object.fromEntries(
    Object.entries(valor).map(([clave, dato]) =>
      clave.endsWith('Gramos')
        ? [`${clave.slice(0, -'Gramos'.length)}Kg`, typeof dato === 'number' ? dato / 1000 : dato]
        : [clave, aKilos(dato)],
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
    return { contenido: JSON.stringify(aKilos(resultado)), esError: false };
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
