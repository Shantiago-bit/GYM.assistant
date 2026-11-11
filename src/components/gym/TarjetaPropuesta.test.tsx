import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PropuestaVista } from '@/lib/chat/propuestas';
import { TarjetaPropuesta } from './TarjetaPropuesta';

const base: Pick<PropuestaVista, 'id' | 'titulo' | 'detalle' | 'estado'> = {
  id: 'p1',
  titulo: 'Archivar «Press»',
  detalle: ['Deja de aparecer en tu lista.'],
  estado: 'pendiente',
};

function montar(propuesta: PropuestaVista) {
  render(<TarjetaPropuesta propuesta={propuesta} deshabilitada={false} alConfirmar={vi.fn()} alCancelar={vi.fn()} />);
}

describe('TarjetaPropuesta', () => {
  afterEach(() => {
    cleanup();
  });

  it('archivar ya no habla de eliminar ni usa el estilo de peligro', () => {
    montar({ ...base, accion: 'archivar', ejercicioId: 'e1', nombre: 'Press' });

    const boton = screen.getByRole('button', { name: 'Confirmar y archivar' });
    expect(boton.className).not.toContain('bg-red');
    expect(screen.queryByText(/eliminar/i)).toBeNull();
  });

  it('restaurar tiene su propio botón de confirmación', () => {
    montar({ ...base, titulo: 'Restaurar «Press»', accion: 'restaurar', ejercicioId: 'e1', nombre: 'Press' });

    expect(screen.getByRole('button', { name: 'Confirmar y restaurar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });
});
