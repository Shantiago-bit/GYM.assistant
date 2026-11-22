import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModoGimnasio } from './ModoGimnasio';

afterEach(() => {
  cleanup();
  delete (navigator as unknown as { wakeLock?: unknown }).wakeLock;
});

describe('Modo gimnasio (pantalla encendida)', () => {
  it('sin Wake Lock en el navegador, el interruptor no aparece', () => {
    render(<ModoGimnasio />);
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('pide la pantalla encendida al entrar, la suelta con el interruptor y al salir', async () => {
    const release = vi.fn(async () => undefined);
    const request = vi.fn(async () => ({ release }));
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });

    const { unmount } = render(<ModoGimnasio />);
    const interruptor = await screen.findByRole('switch');
    await act(async () => undefined);
    expect(request).toHaveBeenCalledWith('screen');
    expect(interruptor).toHaveAttribute('aria-checked', 'true');
    expect(interruptor).toHaveTextContent('pantalla encendida');

    await act(async () => {
      fireEvent.click(interruptor);
    });
    expect(interruptor).toHaveAttribute('aria-checked', 'false');
    expect(release).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(interruptor);
    });
    expect(request).toHaveBeenCalledTimes(2);
    unmount();
    expect(release).toHaveBeenCalledTimes(2);
  });
});
