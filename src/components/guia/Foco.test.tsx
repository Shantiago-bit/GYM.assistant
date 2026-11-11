import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PasoGuia } from '@/lib/guia/recorridos';
import { Foco, type InfoFoco } from './Foco';

const paso = (extra: Partial<PasoGuia> = {}): PasoGuia => ({
  objetivo: 'campo',
  titulo: 'Nombre',
  texto: 'Escribe el nombre.',
  tipo: 'info',
  ...extra,
});

// jsdom no calcula diseño: el objetivo recibe un tamaño a mano.
function crearObjetivo(id = 'campo') {
  const contenedor = document.createElement('div');
  contenedor.setAttribute('data-guia', id);
  contenedor.innerHTML = '<input aria-label="Nombre" />';
  contenedor.getBoundingClientRect = () => ({ top: 100, left: 50, width: 200, height: 40, right: 250, bottom: 140, x: 50, y: 100, toJSON: () => ({}) });
  document.body.appendChild(contenedor);
  return contenedor;
}

function montar(datos: PasoGuia, llamadas = { onSinObjetivo: vi.fn(), onNavegar: vi.fn(), onAvanzar: vi.fn() }) {
  let info: InfoFoco | null = null;
  const vista = render(
    <Foco paso={datos} {...llamadas}>
      {(recibido) => {
        info = recibido;
        return <div data-testid="burbuja" />;
      }}
    </Foco>,
  );
  return { ...vista, llamadas, info: () => info };
}

const zonasBloqueadas = () => document.querySelectorAll('[data-guia-capa] .pointer-events-auto').length;

describe('Foco', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (llamada: FrameRequestCallback) => setTimeout(() => llamada(0), 0));
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('si el objetivo no existe, salta el paso sin romper nada', () => {
    const { llamadas, queryByTestId } = montar(paso({ objetivo: 'no-existe' }));

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(llamadas.onSinObjetivo).toHaveBeenCalledTimes(1);
    expect(queryByTestId('burbuja')).toBeNull();
  });

  it('deja un hueco de 8 px alrededor del objetivo con un anillo y oscurece el resto', () => {
    crearObjetivo();
    const { info } = montar(paso());

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(info()?.hueco).toEqual({ top: 92, left: 42, width: 216, height: 56 });
    expect(document.querySelector('[data-guia-anillo]')).not.toBeNull();
    // 4 rectángulos alrededor y, en un paso informativo, una capa transparente sobre el elemento.
    expect(zonasBloqueadas()).toBe(5);
  });

  it('en un paso interactivo el elemento se puede usar y la condición se cumple al escribir', () => {
    const objetivo = crearObjetivo();
    const { info } = montar(paso({ tipo: 'interactivo', condicion: { tipo: 'con_texto' } }));
    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(zonasBloqueadas()).toBe(4);
    expect(info()?.condicionCumplida).toBe(false);

    const campo = objetivo.querySelector('input')!;
    act(() => {
      campo.value = 'Press de banca';
      fireEvent.input(campo);
    });

    expect(info()?.condicionCumplida).toBe(true);
  });

  it('avanza solo cuando la condición lo indica', () => {
    const objetivo = crearObjetivo();
    const { llamadas } = montar(paso({ tipo: 'interactivo', condicion: { tipo: 'cambiado', avanzaSolo: true } }));
    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(llamadas.onAvanzar).not.toHaveBeenCalled();

    act(() => {
      fireEvent.change(objetivo.querySelector('input')!);
    });

    expect(llamadas.onAvanzar).toHaveBeenCalledTimes(1);
  });

  it('en un paso de navegación avisa cuando la persona pulsa el elemento', () => {
    const objetivo = crearObjetivo();
    const { llamadas } = montar(paso({ tipo: 'navegacion', continua: 'crear_ejercicio' }));
    act(() => {
      vi.advanceTimersByTime(10);
    });

    fireEvent.click(objetivo);

    expect(llamadas.onNavegar).toHaveBeenCalledTimes(1);
  });

  it('un paso sin objetivo oscurece toda la pantalla y muestra la burbuja', () => {
    const { info, getByTestId } = montar(paso({ objetivo: null }));

    expect(getByTestId('burbuja')).toBeInTheDocument();
    expect(info()?.hueco).toBeNull();
    expect(zonasBloqueadas()).toBe(1);
  });
});
