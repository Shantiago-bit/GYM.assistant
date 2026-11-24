import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatGym } from '@/components/gym/ChatGym';
import type { ContextoChat } from '@/lib/chat/contextoVisible';
import { revisarBasico, revisarConAxe } from '@/test/accesibilidad';
import { instalarAlmacenamiento } from '@/test/almacenamiento';

const cliente = vi.hoisted(() => ({ enviarJson: vi.fn() }));
vi.mock('@/lib/http/cliente', () => cliente);

// Datos inventados.
const CONTEXTO: ContextoChat = {
  apodo: 'Vale',
  saludo: 'Buenas tardes',
  dias: ['lunes', 'miércoles', 'viernes'],
  estadoHoy: 'entrenar',
  racha: 3,
  constelacion: { nombre: 'Cinturón de Orión', encendidas: 1, total: 3 },
  ejercicios: [{ id: 'e1', nombre: 'Press de banca', frase: 'Sube a 42,5 kg', listo: true }],
  record: { nombre: 'Press de banca', marca: '40 kg × 10', fecha: '20 nov 2026' },
  sugerencias: [
    { texto: '¿Qué entreno hoy?', icono: 'cronometro', detalle: 'Hoy es uno de tus días.' },
    { texto: '¿Por qué me toca subir en Press de banca?', icono: 'flechaArriba', detalle: 'Llegaste al tope del rango.' },
    { texto: 'Arma una rutina para mis días de entrenamiento', icono: 'cuadro', detalle: 'Un plan con tus ejercicios.' },
  ],
};

let usados = 0;
const pedidosChat: { mensajes: { rol: string; texto: string }[] }[] = [];

// /api/gym/chat responde NDJSON con los eventos que diga la prueba; /api/gym/chat/uso, el contador.
function respuestaChat(eventos: object[]): Response {
  return new Response(eventos.map((evento) => `${JSON.stringify(evento)}\n`).join(''), { status: 200 });
}
let eventosChat: object[] = [];
let colgar = false;

beforeEach(() => {
  usados = 0;
  colgar = false;
  pedidosChat.length = 0;
  eventosChat = [{ tipo: 'texto', texto: 'Hoy toca **pierna**.' }, { tipo: 'fin' }];
  instalarAlmacenamiento({ tipo: 'sessionStorage' });
  // Movimiento reducido: sin intro (la intro se prueba en IntroChrono.test.tsx).
  window.matchMedia = ((consulta: string) => ({
    matches: consulta.includes('reduce'),
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, opciones?: RequestInit) => {
      if (url === '/api/gym/chat/uso') return new Response(JSON.stringify({ usados, limite: 40 }), { status: 200 });
      pedidosChat.push(JSON.parse(String(opciones?.body)));
      usados += 1;
      if (colgar) {
        return new Promise<Response>((_, rechazar) =>
          opciones?.signal?.addEventListener('abort', () => rechazar(new DOMException('cancelado', 'AbortError'))),
        );
      }
      return respuestaChat(eventosChat);
    }),
  );
  cliente.enviarJson.mockResolvedValue({ ok: true, datos: {} });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const campo = () => screen.getByLabelText('Escribe tu mensaje') as HTMLTextAreaElement;
const montar = (props: Partial<Parameters<typeof ChatGym>[0]> = {}) =>
  render(<ChatGym usuarioId="u1" contexto={CONTEXTO} usoInicial={{ usados: 0, limite: 40 }} {...props} />);

describe('estructura y estado vacío', () => {
  it('saludo personalizado, 3 sugerencias inteligentes (se envían) y chips por tema (se escriben)', async () => {
    montar();
    expect(screen.getByRole('heading', { name: 'Buenas tardes, Vale' })).toBeInTheDocument();
    const sugerencias = within(screen.getByRole('list', { name: 'Sugerencias' })).getAllByRole('button');
    expect(sugerencias).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: 'Técnica' }));
    expect(screen.getByRole('button', { name: 'Técnica' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: '¿Qué es el RIR y cómo lo uso?' }));
    expect(campo().value).toBe('¿Qué es el RIR y cómo lo uso?');
    expect(pedidosChat).toHaveLength(0);

    fireEvent.click(sugerencias[0]!);
    await screen.findByText('pierna');
    expect(pedidosChat[0]!.mensajes.at(-1)).toEqual({ rol: 'usuario', texto: '¿Qué entreno hoy?' });
  });

  it('"Tu día": hoy, racha y el ejercicio listo para subir; cada una escribe su pregunta en el campo', () => {
    montar();
    const tuDia = screen.getByRole('region', { name: 'Tu día' });
    const botones = within(tuDia).getAllByRole('button');
    expect(botones.map((boton) => boton.textContent)).toEqual(['HoyHoy toca entrenar', 'Racha actual3 días', 'Listo para subirPress de banca']);
    fireEvent.click(botones[2]!);
    expect(campo().value).toBe('¿Cuánto subo en Press de banca?');
    expect(pedidosChat).toHaveLength(0);
  });

  it('respeta la pregunta que llega escrita desde los accesos rápidos', () => {
    montar({ preguntaInicial: '¿Cómo voy en mis ejercicios?' });
    expect(campo().value).toBe('¿Cómo voy en mis ejercicios?');
  });

  it('axe con el estado vacío', async () => {
    const { container } = montar();
    expect(revisarBasico(container)).toEqual([]);
    expect(await revisarConAxe(container)).toEqual([]);
  });
});

describe('compositor', () => {
  it('Enter envía y Shift+Enter no; el campo crece sin control de tamaño', async () => {
    montar();
    fireEvent.change(campo(), { target: { value: 'Hola' } });
    fireEvent.keyDown(campo(), { key: 'Enter', shiftKey: true });
    expect(pedidosChat).toHaveLength(0);
    expect(campo().className).toContain('resize-none');
    fireEvent.keyDown(campo(), { key: 'Enter' });
    await screen.findByText('pierna');
    expect(pedidosChat).toHaveLength(1);
    expect(campo().value).toBe('');
  });

  it('mientras responde, el botón es "Detener" y Esc detiene la respuesta', async () => {
    colgar = true;
    montar();
    fireEvent.change(campo(), { target: { value: 'Arma una rutina' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByRole('button', { name: 'Detener' })).toBeInTheDocument();
    expect(screen.getByTestId('estado-chrono')).toHaveTextContent('Pensando…');
    fireEvent.keyDown(campo(), { key: 'Escape' });
    expect(await screen.findByRole('button', { name: 'Enviar' })).toBeInTheDocument();
    expect(screen.getByTestId('estado-chrono')).toHaveTextContent('Listo para ayudarte');
  });

  it('el contador se actualiza después de cada mensaje y el compositor se bloquea al llegar al límite', async () => {
    usados = 38;
    montar({ usoInicial: { usados: 38, limite: 40 } });
    expect(screen.getByTestId('contador-chat')).toHaveTextContent('38 de 40 mensajes hoy');
    fireEvent.change(campo(), { target: { value: 'Una' } });
    fireEvent.keyDown(campo(), { key: 'Enter' });
    await waitFor(() => expect(screen.getByTestId('contador-chat')).toHaveTextContent('39 de 40 mensajes hoy'));
    expect(screen.getByTestId('contador-chat').querySelector('.text-aviso')).not.toBeNull();

    fireEvent.change(campo(), { target: { value: 'Otra' } });
    fireEvent.keyDown(campo(), { key: 'Enter' });
    await waitFor(() => expect(screen.getByTestId('contador-chat')).toHaveTextContent('40 de 40 mensajes hoy'));
    expect(await screen.findByText('Llegaste a los 40 mensajes de hoy. CHRONO vuelve mañana.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Escribe tu mensaje')).toBeNull();
  });

  it('contador de caracteres solo cuando faltan menos de 200, y chips de seguimiento que se escriben', async () => {
    montar();
    fireEvent.change(campo(), { target: { value: 'a'.repeat(1700) } });
    expect(screen.queryByText(/Quedan \d+ caracteres/)).toBeNull();
    fireEvent.change(campo(), { target: { value: 'a'.repeat(1850) } });
    expect(screen.getByText('Quedan 150 caracteres')).toBeInTheDocument();

    fireEvent.change(campo(), { target: { value: 'Hola' } });
    fireEvent.keyDown(campo(), { key: 'Enter' });
    await screen.findByText('pierna');
    fireEvent.click(screen.getByRole('button', { name: 'Dame un ejemplo' }));
    expect(campo().value).toBe('Dame un ejemplo');
    expect(pedidosChat).toHaveLength(1);
  });
});

describe('mensajes', () => {
  it('CHRONO sin burbuja, como article "CHRONO dijo"; Copiar confirma y Regenerar reenvía la última pregunta', async () => {
    const escribirPortapapeles = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escribirPortapapeles }, configurable: true });
    const { container } = montar();
    fireEvent.change(campo(), { target: { value: '¿Qué entreno?' } });
    fireEvent.keyDown(campo(), { key: 'Enter' });
    const mensaje = await screen.findByRole('article', { name: 'CHRONO dijo' });
    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite');

    fireEvent.click(within(mensaje).getByRole('button', { name: 'Copiar' }));
    await waitFor(() => expect(within(mensaje).getByRole('button', { name: 'Copiado' })).toBeInTheDocument());
    expect(escribirPortapapeles).toHaveBeenCalledWith('Hoy toca **pierna**.');

    eventosChat = [{ tipo: 'texto', texto: 'Otra respuesta.' }, { tipo: 'fin' }];
    const regenerar = within(mensaje).getByRole('button', { name: 'Regenerar' });
    expect(regenerar).toHaveAttribute('title', expect.stringContaining('cuenta para tu límite'));
    fireEvent.click(regenerar);
    await screen.findByText('Otra respuesta.');
    expect(pedidosChat[1]!.mensajes).toEqual([{ rol: 'usuario', texto: '¿Qué entreno?' }]);
    expect(screen.getAllByRole('article', { name: 'CHRONO dijo' })).toHaveLength(1);

    expect(revisarBasico(container)).toEqual([]);
    expect(await revisarConAxe(container)).toEqual([]);
  });

  it('un error queda en línea con "Reintentar", sin perder lo escrito', async () => {
    eventosChat = [{ tipo: 'error', mensaje: 'CHRONO no está disponible ahora.' }];
    montar();
    fireEvent.change(campo(), { target: { value: 'Hola' } });
    fireEvent.keyDown(campo(), { key: 'Enter' });
    await screen.findByText('CHRONO no está disponible ahora.');
    fireEvent.change(campo(), { target: { value: 'borrador' } });
    eventosChat = [{ tipo: 'texto', texto: 'Ya estoy.' }, { tipo: 'fin' }];
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByText('Ya estoy.');
    expect(campo().value).toBe('borrador');
  });

  it('la propuesta muestra su estado después de confirmar o cancelar, compacta', async () => {
    eventosChat = [
      { tipo: 'texto', texto: 'Te propongo esto:' },
      {
        tipo: 'propuesta',
        propuesta: {
          id: 'p1',
          accion: 'modificar',
          titulo: 'Ajustar «Remo»',
          detalle: ['Enfoque: Fuerza → Hipertrofia'],
          ejercicioId: 'e1',
          nombre: 'Remo',
          nivel: 'Intermedio',
        },
      },
      {
        tipo: 'propuesta',
        propuesta: { id: 'p2', accion: 'archivar', titulo: 'Archivar «Curl»', detalle: ['Deja de aparecer.'], ejercicioId: 'e2', nombre: 'Curl' },
      },
      { tipo: 'fin' },
    ];
    montar();
    fireEvent.change(campo(), { target: { value: 'Ajusta mis ejercicios' } });
    fireEvent.keyDown(campo(), { key: 'Enter' });
    const remo = await screen.findByRole('group', { name: 'Ajustar «Remo»' });
    expect(within(remo).getByText('Fuerza')).toBeInTheDocument();
    expect(within(remo).getByText('Hipertrofia')).toBeInTheDocument();

    fireEvent.click(within(remo).getByRole('button', { name: 'Confirmar cambios' }));
    await waitFor(() => expect(screen.getByRole('group', { name: 'Ajustar «Remo»' })).toHaveAttribute('data-estado', 'confirmada'));
    expect(within(screen.getByRole('group', { name: 'Ajustar «Remo»' })).getByText(/Modificado/)).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('group', { name: 'Archivar «Curl»' })).getByRole('button', { name: 'Cancelar' }));
    expect(within(screen.getByRole('group', { name: 'Archivar «Curl»' })).getByText('Cancelado')).toBeInTheDocument();
  });

  it('"Ir al final" aparece solo cuando la persona subió a leer', async () => {
    montar();
    fireEvent.change(campo(), { target: { value: 'Hola' } });
    fireEvent.keyDown(campo(), { key: 'Enter' });
    await screen.findByText('pierna');
    const lista = screen.getByTestId('lista-chat');
    Object.defineProperty(lista, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(lista, 'clientHeight', { value: 500, configurable: true });

    lista.scrollTop = 1500;
    fireEvent.scroll(lista);
    expect(screen.queryByTestId('ir-al-final')).toBeNull();

    lista.scrollTop = 200;
    fireEvent.scroll(lista);
    expect(screen.getByTestId('ir-al-final')).toHaveTextContent('Ir al final');
    fireEvent.click(screen.getByTestId('ir-al-final'));
    expect(screen.queryByTestId('ir-al-final')).toBeNull();
  });
});

describe('panel "Lo que sé de ti"', () => {
  it('se abre y se cierra con el teclado (Esc), atrapa el foco y cada dato escribe una pregunta', async () => {
    montar();
    const boton = screen.getByRole('button', { name: 'Lo que sé de ti' });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    boton.focus();
    fireEvent.click(boton);
    const hoja = screen.getByRole('dialog', { name: 'Lo que sé de ti' });
    expect(boton).toHaveAttribute('aria-expanded', 'true');
    expect(hoja.contains(document.activeElement)).toBe(true);
    expect(within(hoja).getByText('lunes, miércoles y viernes')).toBeInTheDocument();
    expect(within(hoja).getByText('Cinturón de Orión · 1 de 3')).toBeInTheDocument();
    expect(within(hoja).getByText('CHRONO solo ve estos datos de tu cuenta. Tus mensajes no se guardan en el servidor.')).toBeInTheDocument();
    expect(await revisarConAxe(document.body)).toEqual([]);

    // Tab desde el último elemento vuelve al primero.
    const enfocables = within(hoja).getAllByRole('button');
    enfocables.at(-1)!.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(enfocables[0]);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Lo que sé de ti' })).toBeNull();
    expect(document.activeElement).toBe(boton);

    fireEvent.click(boton);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Press de banca Sube a 42,5 kg/ }));
    expect(campo().value).toBe('¿Cómo voy en Press de banca?');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('menú "Más"', () => {
  it('Nueva conversación pide confirmación si hay mensajes; capacidades y privacidad abren su modal', async () => {
    montar();
    fireEvent.change(campo(), { target: { value: 'Hola' } });
    fireEvent.keyDown(campo(), { key: 'Enter' });
    await screen.findByText('pierna');

    fireEvent.click(screen.getByRole('button', { name: 'Más' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Nueva conversación' }));
    const confirmar = screen.getByRole('dialog', { name: '¿Empezar una conversación nueva?' });
    fireEvent.click(within(confirmar).getByRole('button', { name: 'Empezar de nuevo' }));
    expect(screen.queryByText('pierna')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Buenas tardes, Vale' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Más' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '¿Qué puede hacer CHRONO?' }));
    expect(screen.getByRole('dialog', { name: '¿Qué puede hacer CHRONO?' })).toHaveTextContent('Hasta 40 mensajes por día');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar' }));

    fireEvent.click(screen.getByRole('button', { name: 'Más' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Privacidad del chat' }));
    const privacidad = screen.getByRole('dialog', { name: 'Privacidad del chat' });
    expect(within(privacidad).getByRole('link', { name: 'Leer la política de privacidad' })).toHaveAttribute('href', '/privacidad');
    await act(async () => {});
  });
});
