import Anthropic from '@anthropic-ai/sdk';
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

const INSTRUCCIONES = `Eres el asistente de entrenamiento de Gym Assistant, una app que registra ejercicios de peso y de calistenia y recomienda la siguiente sesión con sobrecarga progresiva (doble progresión: primero se suben repeticiones dentro del rango y, al llegar al tope en las series clave, se sube peso o se pasa a una variante más difícil).

Hablas con una persona que usa la app. Respondes siempre en español, con un tono cercano, claro y motivador.

Cómo trabajas:
- Tienes herramientas para leer sus ejercicios, sesiones, recomendaciones y resúmenes. Úsalas antes de opinar sobre su progreso o de armar una rutina, y no inventes cifras: si un dato no está, dilo.
- La recomendación y el plan por serie que devuelve la app son la referencia para la próxima sesión; explícalos en lugar de recalcularlos.
- Puedes armar rutinas, planes semanales, calentamientos y sugerencias de técnica a partir de sus ejercicios, enfoque (fuerza, hipertrofia o resistencia), método de series y niveles. Si pide algo que no está en sus datos, puedes proponer ejercicios nuevos y decirle que los agregue en la sección Ejercicios.
- No puedes crear, editar ni borrar datos. Si quiere registrar una sesión o cambiar algo, explícale dónde hacerlo en la app: Ejercicios (lista, detalle, prueba inicial, sesión), Entrenamiento (varios ejercicios en una visita) o Resumen (progreso por fechas).
- No das diagnósticos médicos. Ante dolor, lesión o una condición de salud, recomienda parar y consultar a un profesional.

Formato: Markdown sencillo. Usa tablas para rutinas (ejercicio, series, repeticiones, peso o variante, descanso). Sé breve salvo que pida detalle. Los pesos van en kilos.

Responde con latencia baja: empieza tu respuesta visible de inmediato.`;

const AVISO_RECHAZO = 'No puedo ayudarte con esa solicitud. ¿Te ayudo con algo de tu entrenamiento?';

export function crearClienteChat(): Anthropic | null {
  const clave = process.env.ANTHROPIC_API_KEY?.trim();
  return clave ? new Anthropic({ apiKey: clave }) : null;
}

// El historial llega del navegador solo como texto: la conversación debe empezar con la persona.
export function aMensajesDeApi(historial: MensajeChat[]): Anthropic.Beta.BetaMessageParam[] {
  const inicio = historial.findIndex((mensaje) => mensaje.rol === 'usuario');
  return (inicio === -1 ? [] : historial.slice(inicio)).map((mensaje) => ({
    role: mensaje.rol === 'usuario' ? 'user' : 'assistant',
    content: mensaje.texto,
  }));
}

export async function responderChat({
  cliente,
  usuarioId,
  historial,
  hoy,
  emitir,
  senal,
}: {
  cliente: Anthropic;
  usuarioId: string;
  historial: MensajeChat[];
  hoy: string;
  emitir: (evento: EventoChat) => void;
  senal?: AbortSignal | undefined;
}): Promise<void> {
  const mensajes = aMensajesDeApi(historial);
  let hayTexto = false;
  let reintentosJson = 0;

  for (let vuelta = 0; vuelta <= CHAT_MAX_VUELTAS; vuelta++) {
    let textoEnVuelta = false;
    const flujo = cliente.beta.messages.stream(
      {
        model: CHAT_MODELO,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: [
          { type: 'text', text: INSTRUCCIONES, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: `Hoy es ${hoy} (hora de Colombia).` },
        ],
        tools: HERRAMIENTAS,
        // En la última vuelta ya no se consultan datos: el asistente responde con lo que tiene.
        tool_choice: vuelta === CHAT_MAX_VUELTAS ? { type: 'none' } : { type: 'auto' },
        messages: mensajes,
      },
      { signal: senal },
    );

    flujo.on('text', (delta) => {
      if (!textoEnVuelta && hayTexto) {
        emitir({ tipo: 'texto', texto: '\n\n' });
      }
      textoEnVuelta = true;
      hayTexto = true;
      emitir({ tipo: 'texto', texto: delta });
    });

    let mensaje: Anthropic.Beta.BetaMessage;
    try {
      mensaje = await flujo.finalMessage();
      reintentosJson = 0;
    } catch (error) {
      // Con eager_input_streaming, una entrada de herramienta ilegible rechaza el turno: se repite.
      if (error instanceof Anthropic.APIError || senal?.aborted || reintentosJson++ >= 2) {
        throw error;
      }
      vuelta--;
      continue;
    }

    if (mensaje.stop_reason === 'refusal') {
      if (!hayTexto) {
        emitir({ tipo: 'texto', texto: AVISO_RECHAZO });
      }
      return;
    }

    const llamadas = mensaje.content.filter(
      (bloque): bloque is Anthropic.Beta.BetaToolUseBlock => bloque.type === 'tool_use',
    );
    if (llamadas.length === 0) {
      return;
    }
    // Una entrada cortada por max_tokens puede parecer válida: no se ejecuta.
    if (mensaje.stop_reason === 'max_tokens') {
      throw new Error('La respuesta se cortó mientras consultaba datos.');
    }

    mensajes.push({ role: 'assistant', content: mensaje.content });
    for (const llamada of llamadas) {
      emitir({ tipo: 'herramienta', nombre: llamada.name });
    }
    const resultados = await Promise.all(
      llamadas.map(async (llamada): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
        const { contenido, esError } = await ejecutarHerramienta(usuarioId, llamada.name, llamada.input);
        return { type: 'tool_result', tool_use_id: llamada.id, content: contenido, is_error: esError };
      }),
    );
    // Todos los resultados van en un solo mensaje para no desalentar las consultas en paralelo.
    mensajes.push({ role: 'user', content: resultados });
  }
}

export function mensajeDeErrorChat(error: unknown): string {
  if (error instanceof Anthropic.RateLimitError) {
    return 'El asistente está recibiendo muchas consultas. Intenta de nuevo en un momento.';
  }
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return 'El chat no está bien configurado. Avisa al administrador.';
  }
  if (error instanceof Anthropic.APIConnectionError || error instanceof Anthropic.InternalServerError) {
    return 'No se pudo conectar con el asistente. Intenta de nuevo.';
  }
  return 'Ocurrió un error al responder. Intenta de nuevo.';
}
