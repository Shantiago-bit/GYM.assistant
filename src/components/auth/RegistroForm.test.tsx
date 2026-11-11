import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegistroForm } from './RegistroForm';

const fetchFalso = vi.fn();

function llenar(contrasena = 'secure-password-123', confirmacion = contrasena) {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: '  SANTIAGO@example.com ' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: contrasena } });
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: confirmacion } });
  fireEvent.click(screen.getByRole('button', { name: 'Registrarme' }));
}

const respuesta = (estado: number, cuerpo: unknown) => ({ ok: estado < 400, status: estado, json: async () => cuerpo });

describe('registro form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchFalso);
    fetchFalso.mockResolvedValue(
      respuesta(200, { mensaje: 'Si el correo es nuevo, recibirás un enlace para confirmar tu cuenta.' }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('crea la cuenta con la ruta de la app, que envía la confirmación', async () => {
    render(<RegistroForm />);
    llenar();

    await waitFor(() => expect(fetchFalso).toHaveBeenCalled());
    const [url, opciones] = fetchFalso.mock.calls[0]!;
    expect(url).toBe('/api/auth/registro');
    expect(opciones.method).toBe('POST');
    expect(JSON.parse(opciones.body)).toEqual({ email: 'santiago@example.com', password: 'secure-password-123' });
    expect(await screen.findByRole('status')).toHaveTextContent(/enlace para confirmar/i);
  });

  it('no registra contraseñas que no coinciden', () => {
    render(<RegistroForm />);
    llenar('secure-password-123', 'different-password');

    expect(screen.getByRole('alert')).toHaveTextContent('Las contraseñas no coinciden.');
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it('muestra el error que devuelve la app', async () => {
    fetchFalso.mockResolvedValue(
      respuesta(500, { error: 'No se pudo enviar el correo de confirmación. Intenta de nuevo en unos minutos.' }),
    );
    render(<RegistroForm />);
    llenar();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo enviar el correo de confirmación');
  });

  it('avisa si no hay conexión', async () => {
    fetchFalso.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<RegistroForm />);
    llenar();

    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo conectar/);
  });
});
