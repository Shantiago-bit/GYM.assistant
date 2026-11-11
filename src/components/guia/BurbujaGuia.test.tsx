import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BurbujaGuia, type PropiedadesBurbuja } from './BurbujaGuia';

vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));

function montar(extra: Partial<PropiedadesBurbuja> = {}) {
  const llamadas = { onAnterior: vi.fn(), onSiguiente: vi.fn(), onSaltar: vi.fn(), onPausar: vi.fn() };
  render(
    <BurbujaGuia
      titulo="Ejercicios"
      texto="Tu lista de ejercicios."
      numero={3}
      total={8}
      tipo="info"
      hueco={{ top: 100, left: 100, width: 120, height: 40 }}
      objetivo={null}
      condicionCumplida
      puedeAnterior
      esUltimo={false}
      {...llamadas}
      {...extra}
    />,
  );
  return llamadas;
}

describe('BurbujaGuia', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('es un diálogo con título, indicador de paso y texto que se anuncia', () => {
    montar();

    const dialogo = screen.getByRole('dialog', { name: 'Ejercicios' });
    expect(dialogo).toHaveFocus();
    expect(screen.getByText('Paso 3 de 8')).toBeInTheDocument();
    expect(screen.getByText('Tu lista de ejercicios.')).toHaveAttribute('aria-live', 'polite');
    for (const nombre of ['Anterior', 'Siguiente', 'Saltar guía']) {
      expect(screen.getByRole('button', { name: nombre })).toBeInTheDocument();
    }
  });

  it('se maneja con el teclado: → avanza, ← retrocede y Esc pausa', () => {
    const llamadas = montar();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(llamadas.onSiguiente).toHaveBeenCalledTimes(1);
    expect(llamadas.onAnterior).toHaveBeenCalledTimes(1);
    expect(llamadas.onPausar).toHaveBeenCalledTimes(1);
  });

  it('no avanza con → mientras falta completar el campo ni mientras se escribe', () => {
    const objetivo = document.createElement('div');
    objetivo.innerHTML = '<input aria-label="Nombre" />';
    document.body.appendChild(objetivo);
    const llamadas = montar({ tipo: 'interactivo', objetivo, condicionCumplida: false });

    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    expect(screen.getByLabelText('Nombre')).toHaveFocus();
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(llamadas.onSiguiente).not.toHaveBeenCalled();
  });

  it('Tab da la vuelta entre la burbuja y el elemento resaltado', () => {
    const objetivo = document.createElement('div');
    objetivo.innerHTML = '<input aria-label="Nombre" />';
    document.body.appendChild(objetivo);
    montar({ tipo: 'interactivo', objetivo });
    const saltar = screen.getByRole('button', { name: 'Saltar guía' });
    const campo = screen.getByLabelText('Nombre');

    campo.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(saltar).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(campo).toHaveFocus();
  });

  it('en un paso de navegación pide pulsar el elemento y no ofrece Siguiente', () => {
    const llamadas = montar({ tipo: 'navegacion' });

    expect(screen.queryByRole('button', { name: 'Siguiente' })).toBeNull();
    expect(screen.getByText('Pulsa el elemento resaltado para seguir.')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(llamadas.onSiguiente).not.toHaveBeenCalled();
  });

  it('"Saltar guía" cierra el recorrido y el último paso dice Terminar', () => {
    const llamadas = montar({ esUltimo: true, enlaces: [{ texto: 'Ir a Entrenamiento', href: '/gym/entrenamiento' }] });

    expect(screen.getByRole('button', { name: 'Terminar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Entrenamiento' })).toHaveAttribute('href', '/gym/entrenamiento');
    fireEvent.click(screen.getByRole('button', { name: 'Saltar guía' }));
    expect(llamadas.onSaltar).toHaveBeenCalledTimes(1);
  });
});
