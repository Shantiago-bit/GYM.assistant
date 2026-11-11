import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ push: vi.fn(), registrarAccionGuia: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/lib/guia/acciones', () => ({ registrarAccionGuia: mocks.registrarAccionGuia }));

import { BienvenidaGuia } from './BienvenidaGuia';

describe('BienvenidaGuia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.registrarAccionGuia.mockResolvedValue(true);
  });

  afterEach(() => {
    cleanup();
  });

  it('es un diálogo accesible con la bienvenida y tres opciones', () => {
    render(<BienvenidaGuia />);

    const dialogo = screen.getByRole('dialog', { name: '¡Bienvenido a Gym Assistant!' });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveFocus();
    for (const nombre of ['Ver la guía', 'Crear mi primer ejercicio', 'Ahora no']) {
      expect(screen.getByRole('button', { name: nombre })).toBeInTheDocument();
    }
  });

  it.each([
    ['Ver la guía', '/gym/guia'],
    ['Crear mi primer ejercicio', '/gym/ejercicios/nuevo'],
  ])('"%s" marca la bienvenida como vista y lleva a %s', async (boton, destino) => {
    render(<BienvenidaGuia />);

    fireEvent.click(screen.getByRole('button', { name: boton }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(destino));
    expect(mocks.registrarAccionGuia).toHaveBeenCalledWith('bienvenida_vista');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('"Ahora no" y Escape cierran sin navegar y marcan la bienvenida como vista', async () => {
    render(<BienvenidaGuia />);
    fireEvent.click(screen.getByRole('button', { name: 'Ahora no' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    cleanup();
    render(<BienvenidaGuia />);
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(mocks.registrarAccionGuia).toHaveBeenCalledTimes(2);
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('atrapa el foco: Tab desde el último botón vuelve al primero y Shift+Tab da la vuelta', () => {
    render(<BienvenidaGuia />);
    const cerrar = screen.getByRole('button', { name: 'Cerrar' });
    const ahoraNo = screen.getByRole('button', { name: 'Ahora no' });

    ahoraNo.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(cerrar).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(ahoraNo).toHaveFocus();
  });
});
