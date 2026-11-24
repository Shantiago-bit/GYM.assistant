import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revisarBasico, revisarConAxe } from '@/test/accesibilidad';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }) }));

import { BuscadorPersonas } from './BuscadorPersonas';

const ID_1 = '11111111-1111-4111-8111-111111111111';
const ID_2 = '22222222-2222-4222-8222-222222222222';

function responder(datos: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ json: async () => ({ ok: true, datos }) })),
  );
}

beforeEach(() => push.mockReset());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('buscador de personas de la barra superior', () => {
  it('muestra los resultados; las flechas se mueven, Enter abre el detalle y Esc cierra', async () => {
    responder({
      resultados: [
        { id: ID_1, correoMascara: 'a•••a@example.com', apodo: 'Ana', estado: 'confirmada' },
        { id: ID_2, correoMascara: 'a•••o@example.com', apodo: 'Andrés', estado: 'suspendida' },
      ],
      hayMas: false,
    });
    const { container } = render(<BuscadorPersonas />);
    const campo = screen.getByRole('combobox', { name: /Buscar personas/ });
    fireEvent.change(campo, { target: { value: 'an' } });
    await screen.findAllByRole('option');
    const lista = screen.getByRole('listbox', { name: 'Personas encontradas' });
    expect(campo).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(lista).toHaveTextContent('a•••o@example.com · Suspendida');
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('/api/admin/personas/buscar?q=an', expect.anything());
    expect(revisarBasico(container)).toEqual([]);
    expect(await revisarConAxe(container)).toEqual([]);

    fireEvent.keyDown(campo, { key: 'ArrowDown' });
    fireEvent.keyDown(campo, { key: 'ArrowDown' });
    const segunda = screen.getAllByRole('option')[1]!;
    expect(segunda).toHaveAttribute('aria-selected', 'true');
    expect(campo).toHaveAttribute('aria-activedescendant', segunda.id);
    fireEvent.keyDown(campo, { key: 'ArrowDown' }); // vuelve al primero
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(campo, { key: 'ArrowUp' });
    fireEvent.keyDown(campo, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith(`/admin/personas/${ID_2}`);

    fireEvent.focus(campo);
    fireEvent.keyDown(campo, { key: 'Escape' });
    expect(campo).toHaveAttribute('aria-expanded', 'false');
  });

  it('"No hay coincidencias" cuando no encuentra a nadie', async () => {
    responder({ resultados: [], hayMas: false });
    render(<BuscadorPersonas />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'nadie@example.com' } });
    await waitFor(() => expect(screen.getAllByText('No hay coincidencias').length).toBeGreaterThan(0));
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('con más de 8 resultados, enlace a la lista filtrada', async () => {
    responder({
      resultados: Array.from({ length: 8 }, (_, i) => ({
        id: `${String(i).repeat(8)}-1111-4111-8111-111111111111`,
        correoMascara: `p•••${i}@example.com`,
        apodo: `Pepe ${i}`,
        estado: 'confirmada',
      })),
      hayMas: true,
    });
    render(<BuscadorPersonas />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'pe' } });
    const enlace = await screen.findByRole('link', { name: 'Ver todas las coincidencias en la lista' });
    expect(enlace).toHaveAttribute('href', '/admin/personas?q=pe');
    expect(screen.getAllByRole('option')).toHaveLength(8);
  });
});
