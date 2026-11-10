import Groq from 'groq-sdk';
import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import { CHAT_MAX_VUELTAS, CHAT_MODELO } from '@/lib/config/gym';
import { ejecutarHerramienta, HERRAMIENTAS } from '@/lib/chat/herramientas';

export interface MensajeChat {
  rol: 'usuario' | 'asistente';
  texto: string;
}

export type EventoChat =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'herramienta'; nombre: string }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'fin' };

const INSTRUCCIONES = `Eres ATLAS, el asistente virtual de Gym Assistant. Si te preguntan quién eres, preséntate como ATLAS. Gym Assistant es una app que registra ejercicios de peso y de calistenia y recomienda la siguiente sesión con sobrecarga progresiva (doble progresión: primero se suben repeticiones dentro del rango y, al llegar al tope en las series clave, se sube peso o se pasa a una variante más difícil).

Hablas con una persona que usa la app. Respondes siempre en español, con un tono cercano, claro y motivador.

Cómo trabajas:
- Tienes herramientas para leer sus ejercicios, sesiones, recomendaciones y resúmenes. Úsalas antes de opinar sobre su progreso o de armar una rutina, y no inventes cifras: si un dato no está, dilo.
- La recomendación y el plan por serie que devuelve la app son la referencia para la próxima sesión; explícalos en lugar de recalcularlos.
- Puedes armar rutinas, planes semanales, calentamientos y sugerencias de técnica a partir de sus ejercicios, enfoque (fuerza, hipertrofia o resistencia), método de series y niveles. Si pide algo que no está en sus datos, puedes proponer ejercicios nuevos y decirle que los agregue en la sección Ejercicios.
- No puedes crear, editar ni borrar datos. Si quiere registrar una sesión o cambiar algo, explícale dónde hacerlo en la app: Ejercicios (lista, detalle, prueba inicial, sesión), Entrenamiento (varios ejercicios en una visita) o Resumen (progreso por fechas).
- No das diagnósticos médicos. Ante dolor, lesión o una condición de salud, recomienda parar y consultar a un profesional.

Formato: Markdown sencillo. Usa tablas para rutinas (ejercicio, series, repeticiones, peso o variante, descanso). Sé breve salvo que pida detalle. Los pesos van en kilos.`;

const SIN_RESPUESTA = 'No pude generar una respuesta. ¿Puedes reformular la pregunta?';

export function modeloChat(): string {
  return process.env.GROQ_MODELO?.trim() || CHAT_MODELO;
}

export function crearClienteChat(): Groq | null {
  const clave = process.env.GROQ_API_KEY?.trim();
  // Ante un 429 el SDK reintenta respetando retry-after; el tiempo total queda dentro de maxDuration.
  return clave ? new Groq({ apiKey: clave, maxRetries: 2, timeout: 45_000 }) : null;
}

// El historial llega del navegador solo como texto: la conversación debe empezar con la persona.
export function aMensajesDeApi(historial: MensajeChat[]): ChatCompletionMessageParam[] {
  const inicio = historial.findIndex((mensaje) => mensaje.rol === 'usuario');
  return (inicio === -1 ? [] : historial.slice(inicio)).map((mensaje) =>
    mensaje.rol === 'usuario'
      ? { role: 'user', content: mensaje.texto }
      : { role: 'assistant', content: mensaje.texto },
  );
}

interface LlamadaPendiente {
  id: string;
  nombre: string;
  argumentos: string;
}

function leerArgumentos(texto: string): unknown {
  try {
    return JSON.parse(texto || '{}');
  } catch {
    return undefined;
  }
}

export async function responderChat({
  cliente,
  usuarioId,
  historial,
  hoy,
  emitir,
  senal,
}: {
  cliente: Groq;
  usuarioId: string;
  historial: MensajeChat[];
  hoy: string;
  emitir: (evento: EventoChat) => void;
  senal?: AbortSignal | undefined;
}): Promise<void> {
  const mensajes: ChatCompletionMessageParam[] = [
    { role: 'system', content: `${INSTRUCCIONES}\n\nHoy es ${hoy} (hora de Colombia).` },
    ...aMensajesDeApi(historial),
  ];
  let hayTexto = false;

  for (let vuelta = 0; vuelta <= CHAT_MAX_VUELTAS; vuelta++) {
    const flujo = await cliente.chat.completions.create(
      {
        model: modeloChat(),
        stream: true,
        messages: mensajes,
        tools: HERRAMIENTAS,
        // En la última vuelta ya no se consultan datos: ATLAS responde con lo que tiene.
        tool_choice: vuelta === CHAT_MAX_VUELTAS ? 'none' : 'auto',
        reasoning_effort: 'low',
        include_reasoning: false,
        max_completion_tokens: 4096,
      },
      { signal: senal },
    );

    let texto = '';
    let fin: string | null = null;
    const llamadas: LlamadaPendiente[] = [];

    for await (const trozo of flujo) {
      const opcion = trozo.choices[0];
      if (!opcion) {
        continue;
      }
      const { content, tool_calls } = opcion.delta;
      if (content) {
        if (!texto && hayTexto) {
          emitir({ tipo: 'texto', texto: '\n\n' });
        }
        texto += content;
        hayTexto = true;
        emitir({ tipo: 'texto', texto: content });
      }
      // Cada llamada llega por partes; se arma por su índice.
      for (const parcial of tool_calls ?? []) {
        const llamada = (llamadas[parcial.index] ??= { id: '', nombre: '', argumentos: '' });
        llamada.id = parcial.id ?? llamada.id;
        llamada.nombre = parcial.function?.name ?? llamada.nombre;
        llamada.argumentos += parcial.function?.arguments ?? '';
      }
      fin = opcion.finish_reason ?? fin;
    }

    const completas = llamadas.filter((llamada) => llamada?.id && llamada.nombre);
    if (completas.length === 0) {
      if (!hayTexto) {
        emitir({ tipo: 'texto', texto: SIN_RESPUESTA });
      }
      return;
    }
    // Una llamada cortada por el límite de tokens puede tener argumentos incompletos: no se ejecuta.
    if (fin === 'length') {
      throw new Error('La respuesta se cortó mientras consultaba datos.');
    }

    mensajes.push({
      role: 'assistant',
      content: texto || null,
      tool_calls: completas.map((llamada) => ({
        id: llamada.id,
        type: 'function',
        function: { name: llamada.nombre, arguments: llamada.argumentos },
      })),
    });
    for (const llamada of completas) {
      emitir({ tipo: 'herramienta', nombre: llamada.nombre });
    }
    const resultados = await Promise.all(
      completas.map(async (llamada) => {
        const entrada = leerArgumentos(llamada.argumentos);
        const { contenido } =
          entrada === undefined
            ? { contenido: 'Los argumentos no son JSON válido. Vuelve a llamar la herramienta.' }
            : await ejecutarHerramienta(usuarioId, llamada.nombre, entrada);
        return { role: 'tool' as const, tool_call_id: llamada.id, content: contenido };
      }),
    );
    mensajes.push(...resultados);
  }
}

export function mensajeDeErrorChat(error: unknown): string {
  if (error instanceof Groq.RateLimitError) {
    return 'ATLAS llegó al límite de consultas gratuitas por ahora. Intenta de nuevo en un minuto.';
  }
  if (error instanceof Groq.AuthenticationError || error instanceof Groq.PermissionDeniedError) {
    return 'El chat no está bien configurado. Avisa al administrador.';
  }
  if (error instanceof Groq.APIConnectionError || error instanceof Groq.InternalServerError) {
    return 'No se pudo conectar con ATLAS. Intenta de nuevo.';
  }
  return 'Ocurrió un error al responder. Intenta de nuevo.';
}
