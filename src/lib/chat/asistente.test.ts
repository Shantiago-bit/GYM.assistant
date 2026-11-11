import type Groq from 'groq-sdk';
import type { ChatCompletionChunk, ChatCompletionCreateParams } from 'groq-sdk/resources/chat/completions';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ ejecutarHerramienta: vi.fn() }));

vi.mock('@/lib/chat/herramientas', () => ({ HERRAMIENTAS: [], ejecutarHerramienta: mocks.ejecutarHerramienta }));

import { aMensajesDeApi, responderChat, type EventoChat } from './asistente';

type Delta = ChatCompletionChunk.Choice.Delta;

function trozo(delta: Delta, finish_reason: ChatCompletionChunk.Choice['finish_reason'] = null) {
  return { choices: [{ index: 0, delta, finish_reason }] };
}

// Cliente falso: cada llamada reproduce los trozos del siguiente turno preparado.
function clienteFalso(turnos: ReturnType<typeof trozo>[][]) {
  const pedidos: ChatCompletionCreateParams[] = [];
  const create = vi.fn(async (parametros: ChatCompletionCreateParams) => {
    pedidos.push(structuredClone(parametros));
    const turno = turnos.shift();
    if (!turno) throw new Error('No hay más turnos preparados');
    return (async function* () {
      yield* turno;
    })();
  });
  return { cliente: { chat: { completions: { create } } } as unknown as Groq, pedidos };
}

const llamadaListar = (id: string): Delta => ({
  tool_calls: [{ index: 0, id, type: 'function', function: { name: 'listar_ejercicios', arguments: '' } }],
});

describe('aMensajesDeApi', () => {
  it('descarta lo que haya antes del primer mensaje de la persona', () => {
    expect(
      aMensajesDeApi([
        { rol: 'asistente', texto: 'Hola' },
        { rol: 'usuario', texto: '¿Cómo voy?' },
      ]),
    ).toEqual([{ role: 'user', content: '¿Cómo voy?' }]);
  });

  it('une la respuesta de CHRONO con la nota de la app tras confirmar', () => {
    expect(
      aMensajesDeApi([
        { rol: 'usuario', texto: 'Crea sentadilla' },
        { rol: 'asistente', texto: 'Revisa la tarjeta.' },
        { rol: 'asistente', texto: '✅ Listo: se creó el ejercicio «Sentadilla».' },
        { rol: 'usuario', texto: 'Gracias' },
      ]),
    ).toEqual([
      { role: 'user', content: 'Crea sentadilla' },
      { role: 'assistant', content: 'Revisa la tarjeta.\n\n✅ Listo: se creó el ejercicio «Sentadilla».' },
      { role: 'user', content: 'Gracias' },
    ]);
  });
});

describe('responderChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('envía la propuesta a la página como tarjeta y no la aplica', async () => {
    const propuesta = { id: 'p1', accion: 'archivar', titulo: 'Eliminar «Press»', detalle: [], ejercicioId: 'e1', nombre: 'Press' };
    mocks.ejecutarHerramienta.mockResolvedValue({ contenido: '{"estado":"Pendiente"}', esError: false, propuesta });
    const { cliente, pedidos } = clienteFalso([
      [
        trozo({
          tool_calls: [{ index: 0, id: 't1', function: { name: 'proponer_archivar_ejercicio', arguments: '{"ejercicio_id":"e1"}' } }],
        }, 'tool_calls'),
      ],
      [trozo({ content: 'Revisa la tarjeta y pulsa Confirmar.' }, 'stop')],
    ]);
    const eventos: EventoChat[] = [];

    await responderChat({
      cliente,
      usuarioId: 'cuenta-a',
      historial: [{ rol: 'usuario', texto: 'Elimina el press' }],
      hoy: '2026-11-10',
      emitir: (evento) => eventos.push(evento),
    });

    expect(eventos).toEqual([
      { tipo: 'herramienta', nombre: 'proponer_archivar_ejercicio' },
      { tipo: 'propuesta', propuesta },
      { tipo: 'texto', texto: 'Revisa la tarjeta y pulsa Confirmar.' },
    ]);
    expect(pedidos[1]?.messages.at(-1)).toEqual({ role: 'tool', tool_call_id: 't1', content: '{"estado":"Pendiente"}' });
  });

  it('arma la llamada por partes, consulta con la cuenta de la sesión y sigue respondiendo', async () => {
    mocks.ejecutarHerramienta.mockResolvedValue({ contenido: '[]', esError: false });
    const { cliente, pedidos } = clienteFalso([
      [
        trozo({ content: 'Reviso tus datos.' }),
        trozo(llamadaListar('t1')),
        trozo({ tool_calls: [{ index: 0, function: { arguments: '{"incluir_' } }] }),
        trozo({ tool_calls: [{ index: 0, function: { arguments: 'archivados":true}' } }] }, 'tool_calls'),
      ],
      [trozo({ content: 'Aún no tienes ejercicios.' }, 'stop')],
    ]);
    const eventos: EventoChat[] = [];

    await responderChat({
      cliente,
      usuarioId: 'cuenta-a',
      historial: [{ rol: 'usuario', texto: '¿Cómo voy?' }],
      hoy: '2026-11-10',
      emitir: (evento) => eventos.push(evento),
    });

    expect(mocks.ejecutarHerramienta).toHaveBeenCalledWith('cuenta-a', 'listar_ejercicios', {
      incluir_archivados: true,
    });
    expect(eventos).toEqual([
      { tipo: 'texto', texto: 'Reviso tus datos.' },
      { tipo: 'herramienta', nombre: 'listar_ejercicios' },
      { tipo: 'texto', texto: '\n\n' },
      { tipo: 'texto', texto: 'Aún no tienes ejercicios.' },
    ]);
    expect(pedidos[1]?.messages.slice(-2)).toEqual([
      {
        role: 'assistant',
        content: 'Reviso tus datos.',
        tool_calls: [
          {
            id: 't1',
            type: 'function',
            function: { name: 'listar_ejercicios', arguments: '{"incluir_archivados":true}' },
          },
        ],
      },
      { role: 'tool', tool_call_id: 't1', content: '[]' },
    ]);
    expect(pedidos[0]).toMatchObject({
      model: 'openai/gpt-oss-120b',
      stream: true,
      include_reasoning: false,
      reasoning_effort: 'low',
    });
    expect(pedidos[0]?.messages[0]?.role).toBe('system');
    expect(pedidos[0]?.messages[0]?.content).toContain('Eres CHRONO, el asistente de entrenamiento de Gym Assistant');
    expect(pedidos[0]?.messages[0]?.content).toContain('Hoy es 2026-11-10');
  });

  it('en la última vuelta ya no permite consultar datos', async () => {
    mocks.ejecutarHerramienta.mockResolvedValue({ contenido: '[]', esError: false });
    const turnos = Array.from({ length: 6 }, (_, indice) => [trozo(llamadaListar(`t${indice}`), 'tool_calls')]);
    turnos.push([trozo({ content: 'Listo.' }, 'stop')]);
    const { cliente, pedidos } = clienteFalso(turnos);

    await responderChat({
      cliente,
      usuarioId: 'cuenta-a',
      historial: [{ rol: 'usuario', texto: 'Hola' }],
      hoy: '2026-11-10',
      emitir: () => {},
    });

    expect(pedidos).toHaveLength(7);
    expect(pedidos[5]?.tool_choice).toBe('auto');
    expect(pedidos[6]?.tool_choice).toBe('none');
  });

  it('responde al modelo con un error si los argumentos no son JSON', async () => {
    const { cliente, pedidos } = clienteFalso([
      [
        trozo({
          tool_calls: [{ index: 0, id: 't1', function: { name: 'ver_ejercicio', arguments: '{roto' } }],
        }, 'tool_calls'),
      ],
      [trozo({ content: 'No encontré ese ejercicio.' }, 'stop')],
    ]);

    await responderChat({
      cliente,
      usuarioId: 'cuenta-a',
      historial: [{ rol: 'usuario', texto: '¿Y el press?' }],
      hoy: '2026-11-10',
      emitir: () => {},
    });

    expect(mocks.ejecutarHerramienta).not.toHaveBeenCalled();
    expect(pedidos[1]?.messages.at(-1)).toEqual({
      role: 'tool',
      tool_call_id: 't1',
      content: 'Los argumentos no son JSON válido. Vuelve a llamar la herramienta.',
    });
  });

  it('avisa si el modelo no devuelve nada', async () => {
    const { cliente } = clienteFalso([[trozo({}, 'stop')]]);
    const eventos: EventoChat[] = [];

    await responderChat({
      cliente,
      usuarioId: 'cuenta-a',
      historial: [{ rol: 'usuario', texto: 'Hola' }],
      hoy: '2026-11-10',
      emitir: (evento) => eventos.push(evento),
    });

    expect(eventos).toEqual([
      { tipo: 'texto', texto: 'No pude generar una respuesta. ¿Puedes reformular la pregunta?' },
    ]);
  });
});
