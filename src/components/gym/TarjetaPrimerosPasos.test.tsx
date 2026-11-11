import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calcularPrimerosPasos } from '@/lib/reglas/guia';

const mocks = vi.hoisted(() => ({ registrarAccionGuia: vi.fn() }));

vi.mock('@/lib/guia/acciones', () => ({ registrarAccionGuia: mocks.registrarAccionGuia }));

import { TarjetaPrimerosPasos } from './TarjetaPrimerosPasos';

const datos = {
  ejercicios: 1,
  conPruebaInicial: true,
  sesiones: 0,
  maxSesionesPorEjercicio: 0,
  entrenamientoConVarios: false,
  usoChat: false,
};

describe('TarjetaPrimerosPasos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.registrarAccionGuia.mockResolvedValue(true);
  });

  afterEach(() => {
    cleanup();
  });

  it('muestra el avance y enlaza al siguiente paso pendiente', () => {
    render(<TarjetaPrimerosPasos primerosPasos={calcularPrimerosPasos(datos)} />);

    expect(screen.getByRole('region', { name: 'Primeros pasos' })).toBeInTheDocument();
    expect(screen.getByText('2 de 6 completados')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Primeros pasos' })).toHaveAttribute('aria-valuenow', '33');
    expect(screen.getByRole('link', { name: 'Registra tu primera sesión' })).toHaveAttribute('href', '/gym');
    expect(mocks.registrarAccionGuia).not.toHaveBeenCalled();
  });

  it('"Ocultar" la quita y lo guarda para las próximas visitas', () => {
    render(<TarjetaPrimerosPasos primerosPasos={calcularPrimerosPasos(datos)} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar los primeros pasos' }));

    expect(screen.queryByRole('region', { name: 'Primeros pasos' })).not.toBeInTheDocument();
    expect(mocks.registrarAccionGuia).toHaveBeenCalledWith('ocultar_pasos');
  });

  it('con todo completo felicita y se oculta para la siguiente visita', () => {
    render(
      <TarjetaPrimerosPasos
        primerosPasos={calcularPrimerosPasos({
          ...datos,
          sesiones: 3,
          maxSesionesPorEjercicio: 2,
          entrenamientoConVarios: true,
          usoChat: true,
        })}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('¡Completaste los primeros pasos!');
    expect(screen.queryByRole('button', { name: 'Ocultar los primeros pasos' })).not.toBeInTheDocument();
    expect(mocks.registrarAccionGuia).toHaveBeenCalledWith('ocultar_pasos');
  });
});
