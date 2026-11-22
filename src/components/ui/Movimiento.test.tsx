import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// Sin "reducir movimiento" y con IntersectionObserver: el elemento entra en pantalla cuando la prueba lo indica.
let mostrar: (() => void) | null = null;
beforeAll(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(private llamada: IntersectionObserverCallback) {}
      observe() {
        mostrar = () => this.llamada([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      disconnect() {}
    },
  );
});
afterEach(cleanup);

import { CheckDibujado, Confeti, NumeroAnimado } from './Movimiento';

describe('movimiento normal', () => {
  it('el contador espera a estar en pantalla, cuenta desde 0 y termina en el valor correcto; el lector lee el final', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    render(
      <p data-testid="cifra">
        <NumeroAnimado valor={48} sufijo=" días" />
      </p>,
    );
    const cifra = screen.getByTestId('cifra');
    // Antes de verse: el número decorativo está en 0 y el texto para lectores dice el valor real.
    expect(cifra.querySelector('[aria-hidden="true"]')).toHaveTextContent('0 días');
    expect(cifra.querySelector('.sr-only')).toHaveTextContent('48 días');

    await act(async () => {
      mostrar?.();
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    const intermedio = Number(cifra.querySelector('[aria-hidden="true"]')?.textContent?.replace(/\D/g, ''));
    expect(intermedio).toBeGreaterThan(0);
    expect(intermedio).toBeLessThan(48);

    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(cifra).toHaveTextContent(/^48 días$/);
    vi.useRealTimers();
  });

  it('el confeti se monta con 12 a 20 partículas decorativas y se desmonta solo', async () => {
    vi.useFakeTimers();
    const { container } = render(<Confeti particulas={16} />);
    const raiz = container.querySelector('[data-confeti]');
    expect(raiz).toHaveAttribute('aria-hidden', 'true');
    expect(raiz?.children).toHaveLength(16);
    await act(async () => {
      vi.advanceTimersByTime(1300);
    });
    expect(container.querySelector('[data-confeti]')).toBeNull();
    vi.useRealTimers();
  });

  it('el check que se dibuja es decorativo y deja el texto para el lector', () => {
    render(<CheckDibujado texto="Guardado" />);
    expect(screen.getByText('Guardado')).toBeInTheDocument();
    expect(document.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
