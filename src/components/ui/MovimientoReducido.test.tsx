import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// La persona pidió menos movimiento. framer-motion lee la preferencia la primera vez, así que se simula antes de
// importar los componentes.
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (consulta: string) => ({
      matches: consulta.includes('prefers-reduced-motion'),
      media: consulta,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      onchange: null,
      dispatchEvent: () => false,
    }),
  });
  // Con IntersectionObserver disponible y el elemento "en pantalla": aun así no debe animarse.
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(private llamada: IntersectionObserverCallback) {}
      observe() {
        this.llamada([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
      }
      disconnect() {}
    },
  );
});
afterEach(cleanup);

describe('con prefers-reduced-motion', () => {
  it('el contador muestra el valor final de inmediato, sin pasar por 0', async () => {
    const { ProveedorMovimiento } = await import('./ProveedorMovimiento');
    const { NumeroAnimado } = await import('./Movimiento');
    render(
      <ProveedorMovimiento>
        <p data-testid="cifra">
          <NumeroAnimado valor={1250} sufijo=" kg" />
        </p>
      </ProveedorMovimiento>,
    );
    expect(screen.getByTestId('cifra')).toHaveTextContent(/^1\.250 kg$/);
  });

  it('el confeti no se monta', async () => {
    const { Confeti } = await import('./Movimiento');
    const { container } = render(<Confeti />);
    expect(container.querySelector('[data-confeti]')).toBeNull();
  });

  it('la lista animada muestra todos sus elementos', async () => {
    const { ProveedorMovimiento } = await import('./ProveedorMovimiento');
    const { ListaAnimada } = await import('./MovimientoLista');
    render(
      <ProveedorMovimiento>
        <ListaAnimada
          guiaPrimero="tarjeta-ejercicio"
          elementos={[
            { clave: 'a', contenido: <span>Press de banca</span> },
            { clave: 'b', contenido: <span>Dominadas</span> },
          ]}
        />
      </ProveedorMovimiento>,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Press de banca')).toBeVisible();
    expect(screen.getAllByRole('listitem')[0]).toHaveAttribute('data-guia', 'tarjeta-ejercicio');
  });
});
