import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revisarBasico, revisarConAxe } from '@/test/accesibilidad';

const mocks = vi.hoisted(() => ({ enviarJson: vi.fn(), refresh: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh, push: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/lib/http/cliente', () => ({ enviarJson: mocks.enviarJson }));

import { BotonCorreoPrueba } from './BotonCorreoPrueba';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const abrir = () => fireEvent.click(screen.getByRole('button', { name: 'Enviar correo de prueba' }));

describe('BotonCorreoPrueba', () => {
  it('pasa axe; el modal dice a qué cuenta (enmascarada) va y recibe el foco', async () => {
    const { container } = render(<BotonCorreoPrueba destinatarioMascara="a•••••n@example.com" />);
    expect(revisarBasico(container)).toEqual([]);
    expect(await revisarConAxe(container)).toEqual([]);

    abrir();
    const dialogo = screen.getByRole('dialog', { name: 'Enviar un correo de prueba' });
    expect(dialogo).toHaveTextContent('a tu cuenta (a•••••n@example.com)');
    expect(dialogo).toHaveTextContent('uno por minuto');
    await waitFor(() => expect(dialogo.contains(document.activeElement)).toBe(true));
    expect(await revisarConAxe(document.body)).toEqual([]);
  });

  it('Escape y Cancelar cierran sin enviar', () => {
    render(<BotonCorreoPrueba destinatarioMascara="a•••••n@example.com" />);
    abrir();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.enviarJson).not.toHaveBeenCalled();
  });

  it('al confirmar llama a la ruta sin enviar ninguna dirección, muestra el mensaje y refresca', async () => {
    mocks.enviarJson.mockResolvedValue({ ok: true, datos: { mensaje: 'Correo de prueba enviado a a•••••n@example.com.' } });
    render(<BotonCorreoPrueba destinatarioMascara="a•••••n@example.com" />);
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mocks.enviarJson).toHaveBeenCalledWith('/api/admin/correos/prueba');
    expect(screen.getByText('Correo de prueba enviado a a•••••n@example.com.')).toBeInTheDocument();
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it('si la ruta pide esperar, el aviso aparece dentro del modal y no refresca', async () => {
    mocks.enviarJson.mockResolvedValue({ ok: false, codigo: 'ESPERA_REQUERIDA', mensaje: 'Ya enviaste un correo de prueba hace menos de un minuto.' });
    render(<BotonCorreoPrueba destinatarioMascara="a•••••n@example.com" />);
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    const dialogo = await screen.findByRole('dialog');
    await waitFor(() => expect(dialogo).toHaveTextContent('Ya enviaste un correo de prueba hace menos de un minuto.'));
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
