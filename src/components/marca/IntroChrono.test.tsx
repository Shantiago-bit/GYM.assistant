import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatGym } from '@/components/gym/ChatGym';
import { revisarBasico, revisarConAxe } from '@/test/accesibilidad';
import { instalarAlmacenamiento } from '@/test/almacenamiento';
import {
  CLAVE_INTRO_CHRONO,
  DURACION_COMPLETA_MS,
  ESPERA_CORTA_MS,
  SALIDA_MS,
  SALIDA_SALTAR_MS,
  decidirModo,
} from './IntroChrono';

vi.mock('@/lib/http/cliente', () => ({ enviarJson: vi.fn() }));

let movimientoReducido = false;
let sesion: Storage;

const intro = () => document.querySelector<HTMLElement>('[data-testid="intro-chrono"]');
const chat = () => document.querySelector<HTMLElement>('.chat-chrono')!;
const campo = () => screen.getByLabelText('Escribe tu mensaje') as HTMLTextAreaElement;
const avanzar = (ms: number) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  movimientoReducido = false;
  sesion = instalarAlmacenamiento({ tipo: 'sessionStorage' });
  window.matchMedia = ((consulta: string) => ({
    matches: consulta.includes('reduce') && movimientoReducido,
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('decidirModo', () => {
  it('completa la primera vez; corta después o con pregunta; ninguna con movimiento reducido', () => {
    expect(decidirModo({ reducido: false, yaVista: false, conPregunta: false })).toBe('completa');
    expect(decidirModo({ reducido: false, yaVista: true, conPregunta: false })).toBe('corta');
    expect(decidirModo({ reducido: false, yaVista: false, conPregunta: true })).toBe('corta');
    expect(decidirModo({ reducido: true, yaVista: false, conPregunta: false })).toBe('ninguna');
    expect(decidirModo({ reducido: true, yaVista: true, conPregunta: true })).toBe('ninguna');
  });
});

describe('IntroChrono dentro del chat', () => {
  it('el campo de mensaje existe en el DOM desde el primer instante, debajo de la intro', () => {
    render(<ChatGym usuarioId="u1" />);
    expect(intro()).not.toBeNull();
    expect(campo()).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'CHRONO', level: 1 })).toBeInTheDocument();
  });

  it('completa la primera vez de la sesión: 3,1 s, salida de 700 ms y el foco en el campo', () => {
    render(<ChatGym usuarioId="u1" />);
    expect(intro()).toHaveAttribute('data-modo', 'completa');
    expect(chat()).toHaveAttribute('data-intro', 'animando');
    expect(sesion.getItem(CLAVE_INTRO_CHRONO)).toBe('1');
    // Mientras anima, el encabezado guarda el hueco de la baldosa.
    expect(screen.getByTestId('ranura-chrono')).toBeInTheDocument();

    avanzar(DURACION_COMPLETA_MS - 1);
    expect(intro()).toHaveAttribute('data-fase', 'animando');
    avanzar(1);
    expect(intro()).toHaveAttribute('data-fase', 'salida');
    expect(chat()).toHaveAttribute('data-intro', 'salida');
    expect(screen.queryByTestId('ranura-chrono')).toBeNull();

    avanzar(SALIDA_MS);
    expect(intro()).toBeNull();
    expect(chat()).toHaveAttribute('data-intro', 'fin');
    expect(document.activeElement).toBe(campo());
  });

  it('corta en la siguiente apertura de la sesión: menos de 1,1 s en total', () => {
    const { unmount } = render(<ChatGym usuarioId="u1" />);
    unmount();

    render(<ChatGym usuarioId="u1" />);
    expect(intro()).toHaveAttribute('data-modo', 'corta');
    expect(ESPERA_CORTA_MS + SALIDA_MS).toBeLessThan(1100);
    avanzar(ESPERA_CORTA_MS);
    expect(intro()).toHaveAttribute('data-fase', 'salida');
    avanzar(SALIDA_MS);
    expect(intro()).toBeNull();
    expect(document.activeElement).toBe(campo());
  });

  it('corta si llega una pregunta ya escrita (desde los accesos rápidos), aunque sea la primera vez', () => {
    render(<ChatGym usuarioId="u1" preguntaInicial="¿Cómo voy en mis ejercicios?" />);
    expect(intro()).toHaveAttribute('data-modo', 'corta');
    expect(campo().value).toBe('¿Cómo voy en mis ejercicios?');
  });

  it('ninguna con movimiento reducido: el chat aparece directo, con la baldosa en su lugar', () => {
    movimientoReducido = true;
    render(<ChatGym usuarioId="u1" />);
    expect(intro()).toBeNull();
    expect(chat()).toHaveAttribute('data-intro', 'fin');
    expect(screen.queryByTestId('ranura-chrono')).toBeNull();
    expect(chat().querySelector('.baldosa-marca')).not.toBeNull();
    expect(sesion.getItem(CLAVE_INTRO_CHRONO)).toBeNull();
  });

  it('sin sessionStorage no falla (y es completa)', () => {
    instalarAlmacenamiento({ tipo: 'sessionStorage', bloqueado: true });
    render(<ChatGym usuarioId="u1" />);
    expect(intro()).toHaveAttribute('data-modo', 'completa');
  });

  it.each([
    ['el botón Saltar', () => fireEvent.click(screen.getByRole('button', { name: 'Saltar' }))],
    ['la tecla Esc', () => fireEvent.keyDown(window, { key: 'Escape' })],
    ['un clic en la capa', () => fireEvent.click(intro()!)],
  ])('%s pasa directo a la salida en 300 ms y deja el foco en el campo', (_nombre, saltar) => {
    render(<ChatGym usuarioId="u1" />);
    avanzar(800);
    act(() => saltar());
    expect(intro()).toHaveAttribute('data-fase', 'salida');
    expect(intro()).toHaveAttribute('data-saltada', 'si');
    avanzar(SALIDA_SALTAR_MS);
    expect(intro()).toBeNull();
    expect(document.activeElement).toBe(campo());
  });

  it('accesible: animación oculta, «CHRONO, tu asistente» una vez, Saltar es un botón y no hay trampa de foco', async () => {
    const { container } = render(<ChatGym usuarioId="u1" />);
    const capa = intro()!;
    expect(capa.querySelector('.ic-anim')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getAllByText('CHRONO, tu asistente')).toHaveLength(1);
    expect(screen.getByText('CHRONO, tu asistente')).toHaveAttribute('role', 'status');
    expect(capa).not.toHaveAttribute('role', 'dialog');
    expect(capa.querySelector('[tabindex]')).toBeNull();
    // El campo de mensaje sigue alcanzable mientras la intro anima.
    campo().focus();
    expect(document.activeElement).toBe(campo());

    vi.useRealTimers();
    expect(revisarBasico(container)).toEqual([]);
    expect(await revisarConAxe(container)).toEqual([]);
  });

  it('axe después de la intro', async () => {
    const { container } = render(<ChatGym usuarioId="u1" />);
    avanzar(DURACION_COMPLETA_MS);
    avanzar(SALIDA_MS);
    expect(intro()).toBeNull();
    vi.useRealTimers();
    expect(revisarBasico(container)).toEqual([]);
    expect(await revisarConAxe(container)).toEqual([]);
  });

  it('ids únicos: dos intros no comparten degradado ni máscaras', () => {
    render(<ChatGym usuarioId="u1" />);
    sesion.clear();
    render(<ChatGym usuarioId="u2" />);
    const ids = [...document.querySelectorAll('.intro-chrono [id]')].map((el) => el.id);
    expect(ids.length).toBe(6);
    expect(new Set(ids).size).toBe(6);
  });
});
