import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { instalarAlmacenamiento } from '@/test/almacenamiento';
import { revisarBasico, revisarConAxe } from '@/test/accesibilidad';
import { CLAVE_INTRO, DURACION_INTRO_MS, IntroAgon, SALIDA_FIN_MS, SALIDA_SALTAR_MS } from './IntroAgon';

const ruta = vi.hoisted(() => ({ actual: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => ruta.actual }));

// Domingo 22 de noviembre de 2026, 10:00 en Bogotá (15:00 UTC).
const AHORA = new Date('2026-11-22T15:00:00Z');
let movimientoReducido = false;

function intro() {
  return document.querySelector('[data-testid="intro-agon"]');
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(AHORA);
  ruta.actual = '/';
  movimientoReducido = false;
  instalarAlmacenamiento();
  window.history.replaceState(null, '', '/');
  window.matchMedia = ((consulta: string) => ({
    matches: consulta.includes('reduce') && movimientoReducido,
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('IntroAgon', () => {
  it('aparece la primera vez del día, guarda la fecha de Bogotá y no vuelve a aparecer ese día', () => {
    const { unmount } = render(<IntroAgon />);
    expect(intro()).not.toBeNull();
    expect(window.localStorage.getItem(CLAVE_INTRO)).toBe('2026-11-22');
    unmount();

    render(<IntroAgon />);
    expect(intro()).toBeNull();
  });

  it('vuelve a aparecer otro día (el día cambia a la medianoche de Bogotá, no a la UTC)', () => {
    window.localStorage.setItem(CLAVE_INTRO, '2026-11-22');
    // 23 de noviembre a las 02:00 UTC: en Bogotá todavía es el 22.
    vi.setSystemTime(new Date('2026-11-23T02:00:00Z'));
    const { unmount } = render(<IntroAgon />);
    expect(intro()).toBeNull();
    unmount();

    vi.setSystemTime(new Date('2026-11-23T06:00:00Z'));
    render(<IntroAgon />);
    expect(intro()).not.toBeNull();
  });

  it('nunca aparece con movimiento reducido', () => {
    movimientoReducido = true;
    render(<IntroAgon />);
    expect(intro()).toBeNull();
    expect(window.localStorage.getItem(CLAVE_INTRO)).toBeNull();
  });

  it('no se monta fuera de / y /gym', () => {
    for (const otra of ['/gym/perfil', '/login', '/gym/chat', '/privacidad']) {
      ruta.actual = otra;
      const { unmount } = render(<IntroAgon />);
      expect(intro()).toBeNull();
      unmount();
    }
    ruta.actual = '/gym';
    render(<IntroAgon />);
    expect(intro()).not.toBeNull();
  });

  it('no aparece si se llegó con un ancla o con parámetros', () => {
    window.history.replaceState(null, '', '/#plan');
    const { unmount } = render(<IntroAgon />);
    expect(intro()).toBeNull();
    unmount();

    ruta.actual = '/gym';
    window.history.replaceState(null, '', '/gym?filtro=listos');
    render(<IntroAgon />);
    expect(intro()).toBeNull();
  });

  it('sin almacenamiento disponible no falla (y se muestra)', () => {
    instalarAlmacenamiento({ bloqueado: true });
    render(<IntroAgon />);
    expect(intro()).not.toBeNull();
  });

  it('al terminar la animación se desvanece en 300 ms y se desmonta', () => {
    render(<IntroAgon />);
    act(() => vi.advanceTimersByTime(DURACION_INTRO_MS));
    expect(intro()).toHaveAttribute('data-saliendo', 'fin');
    act(() => vi.advanceTimersByTime(SALIDA_FIN_MS));
    expect(intro()).toBeNull();
  });

  it.each([
    ['el botón Saltar', () => fireEvent.click(screen.getByRole('button', { name: 'Saltar' }))],
    ['la tecla Esc', () => fireEvent.keyDown(window, { key: 'Escape' })],
    ['un clic en la capa', () => fireEvent.click(intro()!)],
  ])('%s la cierra en 200 ms', (_nombre, cerrar) => {
    render(<IntroAgon />);
    act(() => cerrar());
    expect(intro()).toHaveAttribute('data-saliendo', 'saltar');
    act(() => vi.advanceTimersByTime(SALIDA_SALTAR_MS));
    expect(intro()).toBeNull();
  });

  it('accesible: la animación está oculta, «Agón» se anuncia una vez, Saltar mide 44 px y no se atrapa el foco', async () => {
    render(
      <>
        <a href="/registro">Crear cuenta</a>
        <IntroAgon />
      </>,
    );
    const capa = intro() as HTMLElement;
    expect(capa.querySelector('.ia-anim')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getAllByText('Agón')).toHaveLength(1);
    expect(capa.querySelector('.ia-saltar')).not.toBeNull();
    expect(capa.querySelector('[tabindex]')).toBeNull();
    expect(capa).not.toHaveAttribute('role', 'dialog');
    // El enlace de la página sigue alcanzable con el teclado.
    screen.getByRole('link', { name: 'Crear cuenta' }).focus();
    expect(document.activeElement).toHaveTextContent('Crear cuenta');
    expect(revisarBasico(document.body)).toEqual([]);
    vi.useRealTimers();
    expect(await revisarConAxe(document.body)).toEqual([]);
  });

  it('los ids del degradado son únicos aunque haya dos intros', () => {
    render(<IntroAgon />);
    window.localStorage.clear();
    render(<IntroAgon />);
    const ids = [...document.querySelectorAll('.intro-agon linearGradient')].map((g) => g.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});
