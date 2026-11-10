import Groq from 'groq-sdk';
import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import { CHAT_MAX_VUELTAS, CHAT_MODELO } from '@/lib/config/gym';
import { ejecutarHerramienta, HERRAMIENTAS } from '@/lib/chat/herramientas';
import { INSTRUCCIONES } from '@/lib/chat/instrucciones';

export interface MensajeChat {
  rol: 'usuario' | 'asistente';
  texto: string;
}

export type EventoChat =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'herramienta'; nombre: string }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'fin' };

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
