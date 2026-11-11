import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormularioAutorizacion } from './FormularioAutorizacion';

const fetchFalso = vi.fn();
const respuesta = (estado: number, cuerpo: unknown) => ({ ok: estado < 400, status: estado, json: async () => cuerpo });
const TOKEN = 'b'.repeat(64);

describe('FormularioAutorizacion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchFalso);
    render(<FormularioAutorizacion token={TOKEN} apodo="Lu" />);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('autorizar envía la decisión con el token y muestra el resultado', async () => {
    fetchFalso.mockResolvedValue(respuesta(200, { ok: true, datos: { mensaje: 'Listo, autorizaste la cuenta.' } }));
    fireEvent.click(screen.getByRole('button', { name: 'Autorizo la cuenta' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Listo, autorizaste la cuenta.');
    expect(JSON.parse(fetchFalso.mock.calls[0]![1].body)).toEqual({ token: TOKEN, decision: 'aprobar' });
    expect(screen.queryByRole('button', { name: 'Autorizo la cuenta' })).not.toBeInTheDocument();
  });

  it('"No autorizo" pide confirmar antes de borrar la cuenta y se puede volver', async () => {
    fireEvent.click(screen.getByRole('button', { name: 'No autorizo' }));
    expect(screen.getByText('¿Seguro que no autorizas la cuenta de Lu?')).toBeInTheDocument();
    expect(fetchFalso).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.getByRole('button', { name: 'Autorizo la cuenta' })).toBeInTheDocument();

    fetchFalso.mockResolvedValue(respuesta(200, { ok: true, datos: { mensaje: 'No autorizaste la cuenta.' } }));
    fireEvent.click(screen.getByRole('button', { name: 'No autorizo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, no autorizo' }));
    expect(await screen.findByRole('status')).toHaveTextContent('No autorizaste la cuenta.');
    expect(JSON.parse(fetchFalso.mock.calls[0]![1].body).decision).toBe('rechazar');
  });

  it('un enlace vencido muestra el mensaje y ya no ofrece botones', async () => {
    fetchFalso.mockResolvedValue(respuesta(410, { ok: false, error: { mensaje: 'Este enlace ya no es válido: venció.' } }));
    fireEvent.click(screen.getByRole('button', { name: 'Autorizo la cuenta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('venció');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
