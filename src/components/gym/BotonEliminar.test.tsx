import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), enviarJson: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock('@/lib/http/cliente', () => ({ enviarJson: mocks.enviarJson }));

import { BotonEliminar } from './BotonEliminar';

function abrir(extra: { archivado?: boolean } = {}) {
  render(<BotonEliminar id="e1" nombre="Press de banca" archivado={false} sesiones={3} series={9} {...extra} />);
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar ejercicio…' }));
}

describe('BotonEliminar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enviarJson.mockResolvedValue({ ok: true, datos: {} });
  });

  afterEach(() => {
    cleanup();
  });

  it('muestra los números reales y deja el foco en el campo del nombre', () => {
    abrir();

    expect(screen.getByRole('dialog', { name: 'Eliminar ejercicio para siempre' })).toBeInTheDocument();
    expect(
      screen.getByText(/Se borrarán Press de banca, sus 3 sesiones y 9 series, incluida la prueba inicial\./),
    ).toBeInTheDocument();
    expect(screen.getByText('Esta acción no se puede deshacer.')).toBeInTheDocument();
    expect(screen.getByLabelText(/para confirmar/)).toHaveFocus();
  });

  it('"Eliminar para siempre" está deshabilitado hasta escribir el nombre, y lo anuncia', async () => {
    abrir();
    const eliminar = screen.getByRole('button', { name: 'Eliminar para siempre' });
    const campo = screen.getByLabelText(/para confirmar/);

    expect(eliminar).toBeDisabled();
    expect(screen.getByText('El botón se habilita cuando el nombre coincide.')).toHaveAttribute('aria-live', 'polite');

    fireEvent.change(campo, { target: { value: 'press' } });
    expect(eliminar).toBeDisabled();

    fireEvent.change(campo, { target: { value: ' press DE BANCA ' } });
    expect(eliminar).toBeEnabled();
    expect(screen.getByText('El nombre coincide: ya puedes eliminar.')).toBeInTheDocument();

    fireEvent.click(eliminar);
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/gym?aviso=eliminado'));
    expect(mocks.enviarJson).toHaveBeenCalledWith('/api/gym/ejercicios/e1', { confirmacion: ' press DE BANCA ' }, 'DELETE');
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it('cancelar o Escape cierran sin llamar a la API', () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar ejercicio…' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(mocks.enviarJson).not.toHaveBeenCalled();
  });

  it('"Archivar en su lugar" archiva en vez de borrar', async () => {
    abrir();

    fireEvent.click(screen.getByRole('button', { name: 'Archivar en su lugar' }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/gym'));
    expect(mocks.enviarJson).toHaveBeenCalledWith('/api/gym/ejercicios/e1/archivar', {}, 'POST');
  });

  it('en un ejercicio archivado no ofrece archivar', () => {
    abrir({ archivado: true });

    expect(screen.queryByRole('button', { name: 'Archivar en su lugar' })).toBeNull();
  });

  it('muestra el error de la API', async () => {
    mocks.enviarJson.mockResolvedValue({ ok: false, codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado.' });
    abrir();
    fireEvent.change(screen.getByLabelText(/para confirmar/), { target: { value: 'Press de banca' } });

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar para siempre' }));

    expect(await screen.findByText('Ocurrió un error inesperado.')).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
