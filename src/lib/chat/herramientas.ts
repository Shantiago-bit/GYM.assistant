import { randomUUID } from 'node:crypto';
import type { ChatCompletionTool } from 'groq-sdk/resources/chat/completions';
import { z } from 'zod';
import type { DatosNuevoEjercicio, Propuesta } from '@/lib/chat/propuestas';
import { CHAT_MAX_SESIONES } from '@/lib/config/gym';
import { listarEjercicios, obtenerEjercicio, obtenerResumen } from '@/lib/dataService';
import { kgAGramos } from '@/lib/formato';
import { rangoPorTipo, textoEnfoque, validarEjercicio } from '@/lib/reglas/ejercicio';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { METODOS, metodoValido, type Metodo } from '@/lib/reglas/metodos';
import { esquemaEjercicio, esquemaEnfoque, esquemaNivel, esquemaResumen } from '@/lib/validacion/esquemas';

const ENFOQUES = ['fuerza', 'hipertrofia', 'resistencia'] as const;
const VALORES_METODO = ['rectas', 'principal_descarga', 'piramide_invertida', 'piramide_ascendente', 'cluster'] as const;

// Tres herramientas de consulta y tres que solo proponen cambios. Ninguna escribe en la base: los cambios
// los aplica la persona con el botón Confirmar de la tarjeta. La cuenta sale siempre de la sesión.
export const HERRAMIENTAS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'listar_ejercicios',
      description:
        'Lista los ejercicios de la persona con su id, tipo, enfoque, método, rango de repeticiones, peso de referencia, ' +
        'nivel (calistenia), número de sesiones, fecha de la última sesión y si ya está lista para subir peso. ' +
        'Úsala antes de hablar de sus ejercicios, de armar una rutina o de proponer un cambio.',
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
      name: 'proponer_crear_ejercicio',
      description:
        'Propone crear un ejercicio. NO lo crea: la app muestra a la persona una tarjeta con Confirmar y Cancelar, y ' +
        'solo se crea si pulsa Confirmar. Los campos que no envíes toman los valores por defecto de la app ' +
        '(enfoque hipertrofia, método series rectas y el rango típico del enfoque).',
      parameters: {
        type: 'object',
        properties: {
          nombre: { type: 'string', description: 'Nombre del ejercicio, hasta 120 caracteres.' },
          tipo: { type: 'string', enum: ['peso', 'calistenia'], description: 'peso (con carga externa) o calistenia.' },
          enfoque: { type: 'string', enum: [...ENFOQUES] },
          metodo: {
            type: 'string',
            enum: [...VALORES_METODO],
            description: 'Método de series. Los distintos de rectas y cluster solo valen para ejercicios de peso.',
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
  {
    type: 'function',
    function: {
      name: 'proponer_modificar_ejercicio',
      description:
        'Propone cambiar el enfoque, el método, el rango de repeticiones o el nivel (solo calistenia) de un ejercicio. ' +
        'NO lo cambia: la persona debe pulsar Confirmar en la tarjeta. Envía solo los campos que cambian; si cambias ' +
        'el enfoque sin indicar rango, se usa el rango típico del nuevo enfoque.',
      parameters: {
        type: 'object',
        properties: {
          ejercicio_id: { type: 'string', description: 'Id del ejercicio, tal como lo devuelve listar_ejercicios.' },
          enfoque: { type: 'string', enum: [...ENFOQUES] },
          metodo: { type: 'string', enum: [...VALORES_METODO] },
          rango_min: { type: 'integer' },
          rango_max: { type: 'integer' },
          nivel: { type: 'string', description: 'Nueva variante o nivel (solo calistenia).' },
        },
        required: ['ejercicio_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'proponer_archivar_ejercicio',
      description:
        'Propone eliminar un ejercicio de la lista de la persona. En la app eliminar es archivar: deja de aparecer en ' +
        'la lista y se conserva su historial. NO lo archiva: la persona debe pulsar Confirmar en la tarjeta.',
      parameters: {
        type: 'object',
        properties: {
          ejercicio_id: { type: 'string', description: 'Id del ejercicio, tal como lo devuelve listar_ejercicios.' },
        },
        required: ['ejercicio_id'],
      },
    },
  },
];

// El modelo puede mandar null en un campo opcional: se trata como ausente.
function sinVacios<T extends Record<string, unknown>>(objeto: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(objeto).filter(([, valor]) => valor !== null && valor !== undefined),
  ) as Partial<T>;
}

const ENTRADAS = {
  listar_ejercicios: z.object({ incluir_archivados: z.boolean().nullish() }),
  ver_ejercicio: z.object({ ejercicio_id: z.string().min(1) }),
  resumen_periodo: esquemaResumen,
  // Los nombres en snake_case del modelo se pasan al mismo esquema que valida el formulario de la app.
  proponer_crear_ejercicio: z
    .object({
      nombre: z.unknown(),
      tipo: z.unknown(),
      enfoque: z.unknown(),
      metodo: z.unknown(),
      peso_ref_kg: z.unknown(),
      nivel: z.unknown(),
      rango_min: z.unknown(),
      rango_max: z.unknown(),
    })
    .transform(({ peso_ref_kg, rango_min, rango_max, ...resto }) =>
      sinVacios({ ...resto, pesoRefKg: peso_ref_kg, rangoMin: rango_min, rangoMax: rango_max }),
    )
    .pipe(esquemaEjercicio),
  proponer_modificar_ejercicio: z
    .object({
      ejercicio_id: z.string().min(1),
      enfoque: z.enum(ENFOQUES).nullish(),
      metodo: z.enum(VALORES_METODO).nullish(),
      rango_min: z.number().int().nullish(),
      rango_max: z.number().int().nullish(),
      nivel: z.string().nullish(),
    })
    .transform(sinVacios),
  proponer_archivar_ejercicio: z.object({ ejercicio_id: z.string().min(1) }),
};

function textoMetodo(metodo: Metodo): string {
  return METODOS.find((opcion) => opcion.valor === metodo)?.texto ?? metodo;
}

function exigirMetodo(tipo: DatosNuevoEjercicio['tipo'], metodo: Metodo): void {
  if (!metodoValido(tipo, metodo)) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', `El método ${textoMetodo(metodo)} solo está disponible para ejercicios de peso.`);
  }
}

const normalizar = (nombre: string) => nombre.trim().toLowerCase();

async function proponerCrear(usuarioId: string, entrada: unknown): Promise<Propuesta> {
  const d = ENTRADAS.proponer_crear_ejercicio.parse(entrada);
  // Los valores por defecto son los mismos que aplica crearEjercicio, para que la tarjeta muestre lo que se guardará.
  const enfoque = d.enfoque ?? 'hipertrofia';
  const metodo = d.metodo ?? 'rectas';
  exigirMetodo(d.tipo, metodo);
  const [minPorDefecto, maxPorDefecto] = rangoPorTipo(d.tipo, enfoque);
  const datos: DatosNuevoEjercicio = {
    nombre: d.nombre.trim(),
    tipo: d.tipo,
    enfoque,
    metodo,
    rangoMin: d.rangoMin ?? minPorDefecto,
    rangoMax: d.rangoMax ?? maxPorDefecto,
  };
  if (d.tipo === 'peso' && d.pesoRefKg !== undefined) datos.pesoRefKg = d.pesoRefKg;
  if (d.tipo === 'calistenia' && d.nivel?.trim()) datos.nivel = d.nivel.trim();

  validarEjercicio({
    nombre: datos.nombre,
    tipo: datos.tipo,
    pesoRefGramos: datos.pesoRefKg === undefined ? null : kgAGramos(datos.pesoRefKg),
    nivel: datos.nivel ?? null,
    rangoMin: datos.rangoMin,
    rangoMax: datos.rangoMax,
  });
  const existentes = await listarEjercicios(usuarioId, { incluirArchivados: true });
  if (existentes.some((ejercicio) => normalizar(ejercicio.nombre) === normalizar(datos.nombre))) {
    throw new ErrorDeNegocio('EJERCICIO_DUPLICADO');
  }

  const detalle = [
    `Tipo: ${datos.tipo === 'peso' ? 'peso' : 'calistenia'}`,
    `Enfoque: ${textoEnfoque(enfoque)}`,
    `Método: ${textoMetodo(metodo)}`,
    `Rango: ${datos.rangoMin}–${datos.rangoMax} repeticiones`,
  ];
  if (datos.pesoRefKg !== undefined) detalle.push(`Peso de referencia: ${datos.pesoRefKg} kg`);
  if (datos.nivel) detalle.push(`Nivel: ${datos.nivel}`);

  return { id: randomUUID(), accion: 'crear', titulo: `Crear «${datos.nombre}»`, detalle, datos };
}

async function proponerModificar(usuarioId: string, entrada: unknown): Promise<Propuesta> {
  const e = ENTRADAS.proponer_modificar_ejercicio.parse(entrada);
  const { ejercicio } = await obtenerEjercicio(usuarioId, e.ejercicio_id!);
  const detalle: string[] = [];
  const propuesta: Propuesta = {
    id: randomUUID(),
    accion: 'modificar',
    titulo: `Modificar «${ejercicio.nombre}»`,
    detalle,
    ejercicioId: ejercicio.id,
    nombre: ejercicio.nombre,
  };

  if (e.enfoque !== undefined || e.metodo !== undefined || e.rango_min !== undefined || e.rango_max !== undefined) {
    const enfoque = e.enfoque ?? ejercicio.enfoque;
    const metodo = e.metodo ?? ejercicio.metodo;
    exigirMetodo(ejercicio.tipo, metodo);
    const cambiaEnfoqueSinRango = enfoque !== ejercicio.enfoque && e.rango_min === undefined && e.rango_max === undefined;
    const [minBase, maxBase] = cambiaEnfoqueSinRango ? rangoPorTipo(ejercicio.tipo, enfoque) : ejercicio.rango;
    const cambio = esquemaEnfoque.parse({
      enfoque,
      metodo,
      rangoMin: e.rango_min ?? minBase,
      rangoMax: e.rango_max ?? maxBase,
    });

    if (cambio.enfoque !== ejercicio.enfoque) {
      detalle.push(`Enfoque: ${textoEnfoque(ejercicio.enfoque)} → ${textoEnfoque(cambio.enfoque)}`);
    }
    if (metodo !== ejercicio.metodo) {
      detalle.push(`Método: ${textoMetodo(ejercicio.metodo)} → ${textoMetodo(metodo)}`);
    }
    if (cambio.rangoMin !== ejercicio.rango[0] || cambio.rangoMax !== ejercicio.rango[1]) {
      detalle.push(`Rango: ${ejercicio.rango[0]}–${ejercicio.rango[1]} → ${cambio.rangoMin}–${cambio.rangoMax} repeticiones`);
    }
    if (detalle.length > 0) {
      propuesta.enfoque = { enfoque: cambio.enfoque, metodo, rangoMin: cambio.rangoMin, rangoMax: cambio.rangoMax };
    }
  }

  if (e.nivel !== undefined) {
    if (ejercicio.tipo !== 'calistenia') {
      throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Solo los ejercicios de calistenia tienen nivel.');
    }
    const { nivel } = esquemaNivel.parse({ nivel: e.nivel });
    if (nivel !== ejercicio.nivel) {
      detalle.push(`Nivel: ${ejercicio.nivel ?? 'sin nivel'} → ${nivel}`);
      propuesta.nivel = nivel;
    }
  }

  if (detalle.length === 0) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'No hay cambios: esos valores ya son los actuales del ejercicio.');
  }
  return propuesta;
}

async function proponerArchivar(usuarioId: string, entrada: unknown): Promise<Propuesta> {
  const { ejercicio_id } = ENTRADAS.proponer_archivar_ejercicio.parse(entrada);
  const { ejercicio } = await obtenerEjercicio(usuarioId, ejercicio_id);
  if (ejercicio.archivado) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Ese ejercicio ya está archivado.');
  }
  const sesiones = ejercicio.totalSesiones === 1 ? '1 sesión' : `${ejercicio.totalSesiones} sesiones`;
  return {
    id: randomUUID(),
    accion: 'archivar',
    titulo: `Eliminar «${ejercicio.nombre}» de tu lista`,
    detalle: ['Se archiva: deja de aparecer en tu lista de ejercicios.', `Se conservan sus ${sesiones} y su historial.`],
    ejercicioId: ejercicio.id,
    nombre: ejercicio.nombre,
  };
}

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

const PROPONEDORES: Record<string, (usuarioId: string, entrada: unknown) => Promise<Propuesta>> = {
  proponer_crear_ejercicio: proponerCrear,
  proponer_modificar_ejercicio: proponerModificar,
  proponer_archivar_ejercicio: proponerArchivar,
};

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

export interface ResultadoHerramienta {
  contenido: string;
  esError: boolean;
  propuesta?: Propuesta;
}

export async function ejecutarHerramienta(
  usuarioId: string,
  nombre: string,
  entrada: unknown,
): Promise<ResultadoHerramienta> {
  try {
    const proponer = PROPONEDORES[nombre];
    if (proponer) {
      const propuesta = await proponer(usuarioId, entrada);
      return {
        contenido: JSON.stringify({
          propuesta_mostrada: propuesta.titulo,
          detalle: propuesta.detalle,
          estado: 'Pendiente. Todavía NO se aplicó: la persona debe pulsar Confirmar en la tarjeta.',
        }),
        esError: false,
        propuesta,
      };
    }
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
