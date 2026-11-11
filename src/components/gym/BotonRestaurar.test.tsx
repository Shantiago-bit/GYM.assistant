import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), enviarJson: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }));
vi.mock('@/lib/http/cliente', () => ({ enviarJson: mocks.enviarJson }));

import { BotonRestaurar } from './BotonRestaurar';

describe('BotonRestaurar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enviarJson.mockResolvedValue({ ok: true, datos: { archivado: false } });
  });

  afterEach(() => {
    cleanup();
  });

  it('llama a la ruta de restaurar, vuelve con el aviso y refresca', async () => {
    render(<BotonRestaurar id="e1" destino="/gym/ejercicios/e1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));

    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    expect(mocks.enviarJson).toHaveBeenCalledWith('/api/gym/ejercicios/e1/restaurar');
    expect(mocks.replace).toHaveBeenCalledWith('/gym/ejercicios/e1?aviso=restaurado');
  });

  it('desde la lista de archivados conserva el filtro', async () => {
    render(<BotonRestaurar id="e1" destino="/gym?archivados=1" variante="secundario" />);

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/gym?archivados=1&aviso=restaurado'));
  });

  it('muestra el error si no se pudo restaurar', async () => {
    mocks.enviarJson.mockResolvedValue({ ok: false, codigo: 'EJERCICIO_NO_ENCONTRADO', mensaje: 'El ejercicio no existe.' });
    render(<BotonRestaurar id="e1" destino="/gym" />);

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El ejercicio no existe.');
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
