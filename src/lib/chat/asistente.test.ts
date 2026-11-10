import type Anthropic from '@anthropic-ai/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ ejecutarHerramienta: vi.fn() }));

vi.mock('@/lib/chat/herramientas', () => ({ HERRAMIENTAS: [], ejecutarHerramienta: mocks.ejecutarHerramienta }));

import { aMensajesDeApi, responderChat, type EventoChat } from './asistente';

type Turno = { textos: string[]; mensaje: Partial<Anthropic.Beta.BetaMessage> };

// Cliente falso: cada llamada a stream() reproduce el siguiente turno preparado.
function clienteFalso(turnos: Turno[]) {
  const pedidos: Anthropic.Beta.Messages.MessageCreateParamsStreaming[] = [];
  const stream = vi.fn((parametros) => {
    pedidos.push(structuredClone(parametros));
    const turno = turnos.shift();
    if (!turno) throw new Error('No hay más turnos preparados');
    let alTexto: (delta: string) => void = () => {};
    return {
      on: (_evento: string, oyente: (delta: string) => void) => {
        alTexto = oyente;
      },
      finalMessage: async () => {
        turno.textos.forEach((texto) => alTexto(texto));
        return { content: [], stop_reason: 'end_turn', ...turno.mensaje };
      },
    };
  });
  return { cliente: { beta: { messages: { stream } } } as unknown as Anthropic, pedidos };
}

describe('aMensajesDeApi', () => {
  it('descarta lo que haya antes del primer mensaje de la persona', () => {
    expect(
      aMensajesDeApi([
        { rol: 'asistente', texto: 'Hola' },
        { rol: 'usuario', texto: '¿Cómo voy?' },
      ]),
    ).toEqual([{ role: 'user', content: '¿Cómo voy?' }]);
  });
});

describe('responderChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta los datos con la cuenta de la sesión y sigue respondiendo', async () => {
    mocks.ejecutarHerramienta.mockResolvedValue({ contenido: '[]', esError: false });
    const llamada = { type: 'tool_use', id: 't1', name: 'listar_ejercicios', input: {} };
    const { cliente, pedidos } = clienteFalso([
      { textos: ['Reviso tus datos.'], mensaje: { content: [llamada] as never, stop_reason: 'tool_use' } },
      { textos: ['Aún no tienes ejercicios.'], mensaje: { stop_reason: 'end_turn' } },
    ]);
    const eventos: EventoChat[] = [];

    await responderChat({
      cliente,
      usuarioId: 'cuenta-a',
      historial: [{ rol: 'usuario', texto: '¿Cómo voy?' }],
      hoy: '2026-11-10',
      emitir: (evento) => eventos.push(evento),
    });

    expect(mocks.ejecutarHerramienta).toHaveBeenCalledWith('cuenta-a', 'listar_ejercicios', {});
    expect(eventos).toEqual([
      { tipo: 'texto', texto: 'Reviso tus datos.' },
      { tipo: 'herramienta', nombre: 'listar_ejercicios' },
      { tipo: 'texto', texto: '\n\n' },
      { tipo: 'texto', texto: 'Aún no tienes ejercicios.' },
    ]);
    expect(pedidos[1]?.messages.at(-1)).toEqual({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: 't1', content: '[]', is_error: false }],
    });
    expect(pedidos[0]).toMatchObject({ model: 'claude-opus-5-5', fallbacks: 'default' });
  });

  it('en la última vuelta ya no permite consultar datos', async () => {
    mocks.ejecutarHerramienta.mockResolvedValue({ contenido: '[]', esError: false });
    const llamada = { type: 'tool_use', id: 't', name: 'listar_ejercicios', input: {} };
    const turnos: Turno[] = Array.from({ length: 6 }, () => ({
      textos: [],
      mensaje: { content: [llamada] as never, stop_reason: 'tool_use' },
    }));
    turnos.push({ textos: ['Listo.'], mensaje: { stop_reason: 'end_turn' } });
    const { cliente, pedidos } = clienteFalso(turnos);

    await responderChat({
      cliente,
      usuarioId: 'cuenta-a',
      historial: [{ rol: 'usuario', texto: 'Hola' }],
      hoy: '2026-11-10',
      emitir: () => {},
    });

    expect(pedidos).toHaveLength(7);
    expect(pedidos[5]?.tool_choice).toEqual({ type: 'auto' });
    expect(pedidos[6]?.tool_choice).toEqual({ type: 'none' });
  });

  it('avisa con un texto propio si el modelo rechaza la solicitud', async () => {
    const { cliente } = clienteFalso([{ textos: [], mensaje: { stop_reason: 'refusal' } }]);
    const eventos: EventoChat[] = [];

    await responderChat({
      cliente,
      usuarioId: 'cuenta-a',
      historial: [{ rol: 'usuario', texto: 'Algo indebido' }],
      hoy: '2026-11-10',
      emitir: (evento) => eventos.push(evento),
    });

    expect(eventos).toEqual([
      { tipo: 'texto', texto: 'No puedo ayudarte con esa solicitud. ¿Te ayudo con algo de tu entrenamiento?' },
    ]);
  });
});
