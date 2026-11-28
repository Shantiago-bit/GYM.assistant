import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revisarBasico, revisarConAxe } from '@/test/accesibilidad';

const mocks = vi.hoisted(() => ({ enviarJson: vi.fn(), refresh: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh, push: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/lib/http/cliente', () => ({ enviarJson: mocks.enviarJson }));

import { FormularioMeta } from './FormularioMeta';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const campo = () => screen.getByRole('spinbutton', { name: /Nueva meta/ });
const escribir = (valor: string) => fireEvent.change(campo(), { target: { value: valor } });
// Enter dentro del campo envía el formulario, como con el teclado.
const enviarConEnter = () => fireEvent.submit(campo().closest('form')!);

describe('FormularioMeta', () => {
  it('pasa axe y el campo tiene etiqueta, ayuda y el valor actual', async () => {
    const { container } = render(<FormularioMeta metaActual={50} />);
    expect(revisarBasico(container)).toEqual([]);
    expect(await revisarConAxe(container)).toEqual([]);
    expect(campo()).toHaveValue(50);
    expect(campo()).toHaveAccessibleDescription('Entre 1 y 1.000.000.');
  });

  it.each([
    ['vacío', ''],
    ['cero', '0'],
    ['decimal', '12.5'],
    ['por encima del máximo', '1000001'],
  ])('valor no válido (%s): error asociado al campo y no abre la confirmación', (_caso, valor) => {
    render(<FormularioMeta metaActual={50} />);
    escribir(valor);
    enviarConEnter();
    expect(campo()).toHaveAttribute('aria-invalid', 'true');
    expect(campo()).toHaveAccessibleDescription(/número entero entre 1 y 1\.000\.000/);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.enviarJson).not.toHaveBeenCalled();
  });

  it('el mismo valor de ahora no abre la confirmación', () => {
    render(<FormularioMeta metaActual={50} />);
    enviarConEnter();
    expect(campo()).toHaveAccessibleDescription('La meta ya es de 50 personas activas por mes.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('confirmación con el antes y el después; Escape la cierra sin enviar', async () => {
    render(<FormularioMeta metaActual={50} />);
    escribir('120');
    enviarConEnter();
    const dialogo = screen.getByRole('dialog', { name: 'Cambiar la meta del mes' });
    expect(dialogo).toHaveTextContent('La meta pasa de 50 a 120 personas activas por mes.');
    await waitFor(() => expect(dialogo.contains(document.activeElement)).toBe(true));
    expect(await revisarConAxe(document.body)).toEqual([]);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.enviarJson).not.toHaveBeenCalled();
  });

  it('al confirmar llama a PUT /api/admin/metas, muestra el mensaje y refresca la página', async () => {
    mocks.enviarJson.mockResolvedValue({ ok: true, datos: { mensaje: 'Meta actualizada: 120 personas activas por mes.' } });
    render(<FormularioMeta metaActual={50} />);
    escribir('120');
    enviarConEnter();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar meta' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mocks.enviarJson).toHaveBeenCalledWith('/api/admin/metas', { valor: 120 }, 'PUT');
    expect(screen.getByText('Meta actualizada: 120 personas activas por mes.')).toBeInTheDocument();
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it('si la API responde con error, lo muestra dentro del modal y no refresca', async () => {
    mocks.enviarJson.mockResolvedValue({ ok: false, codigo: 'SOLO_LECTURA', mensaje: 'Tu acceso de administración es de solo lectura.' });
    render(<FormularioMeta metaActual={50} />);
    escribir('70');
    enviarConEnter();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar meta' }));

    const dialogo = await screen.findByRole('dialog');
    await waitFor(() => expect(dialogo).toHaveTextContent('Tu acceso de administración es de solo lectura.'));
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
