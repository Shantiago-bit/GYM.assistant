import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { instalarAlmacenamiento } from '@/test/almacenamiento';
import { revisarConAxe } from '@/test/accesibilidad';
import { estadoConstelacion } from '@/lib/reglas/constelacion';
import { CieloConstelacion, estrellaNueva } from './CieloConstelacion';
import { TextoConstelacion } from './TextoConstelacion';

// Casiopea (L a V) con lunes, martes y jueves entrenados: 3 de 5.
const estado = estadoConstelacion({
  hoy: '2026-11-20',
  historialDias: [{ dias: [1, 2, 3, 4, 5], vigenteDesde: '2026-01-01' }],
  fechasConSesion: ['2026-11-16', '2026-11-17', '2026-11-19'],
});

let reducido = false;
let cuadros: ReturnType<typeof vi.fn>;

// Un contexto 2D falso: cada método es un no-op (jsdom no dibuja).
function contextoFalso(): CanvasRenderingContext2D {
  const gradiente = { addColorStop: () => {} };
  return new Proxy({} as CanvasRenderingContext2D, {
    get: (_objeto, propiedad) =>
      propiedad === 'createRadialGradient' || propiedad === 'createLinearGradient' ? () => gradiente : () => {},
    set: () => true,
  });
}

beforeEach(() => {
  reducido = false;
  instalarAlmacenamiento();
  window.matchMedia = ((consulta: string) => ({
    matches: consulta.includes('reduce') ? reducido : consulta.includes('fine'),
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  HTMLCanvasElement.prototype.getContext = (() => contextoFalso()) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  cuadros = vi.fn(() => 1);
  window.requestAnimationFrame = cuadros as unknown as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = () => {};
  document.body.innerHTML = '<div id="cielo-gym"></div>';
});
afterEach(cleanup);

describe('TextoConstelacion', () => {
  it('muestra el nombre y "3 de 5 estrellas"; el mito se abre al enfocar o tocar el nombre', async () => {
    const { container } = render(<TextoConstelacion estado={estado} />);
    expect(container).toHaveTextContent('Tu constelación: Casiopea · 3 de 5 estrellas');
    const nombre = screen.getByRole('button', { name: 'Casiopea' });
    expect(nombre).toHaveAttribute('aria-expanded', 'false');
    act(() => nombre.focus());
    expect(nombre).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('La reina en su trono, condenada a girar alrededor del polo.')).toBeVisible();
    fireEvent.keyDown(nombre, { key: 'Escape' });
    expect(nombre).toHaveAttribute('aria-expanded', 'false');
    expect(await revisarConAxe(container)).toEqual([]);
  });

  it('al completar la semana: "Esta semana completaste <constelación>"', () => {
    const completa = estadoConstelacion({
      hoy: '2026-11-18',
      historialDias: [{ dias: [1, 3], vigenteDesde: '2026-01-01' }],
      fechasConSesion: ['2026-11-16', '2026-11-18'],
    });
    const { container } = render(<TextoConstelacion estado={completa} />);
    expect(container).toHaveTextContent('2 de 2 estrellas');
    expect(container).toHaveTextContent('Esta semana completaste Cástor y Pólux');
  });
});

describe('CieloConstelacion', () => {
  it('es un solo canvas decorativo (aria-hidden) montado en #cielo-gym', () => {
    render(<CieloConstelacion estado={estado} />);
    const cielo = screen.getByTestId('cielo-constelacion');
    expect(cielo).toHaveAttribute('aria-hidden', 'true');
    expect(cielo.parentElement?.id).toBe('cielo-gym');
    expect(cielo.querySelectorAll('canvas')).toHaveLength(1);
    expect(cuadros).toHaveBeenCalled();
  });

  it('con movimiento reducido: una imagen fija, sin requestAnimationFrame', () => {
    reducido = true;
    render(<CieloConstelacion estado={estado} />);
    expect(screen.getByTestId('cielo-constelacion')).toBeInTheDocument();
    expect(cuadros).not.toHaveBeenCalled();
  });

  it('se pausa con la pestaña oculta', () => {
    const cancelar = vi.fn();
    window.cancelAnimationFrame = cancelar;
    render(<CieloConstelacion estado={estado} />);
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(cancelar).toHaveBeenCalled();
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });

  it('recuerda lo visto: la próxima visita no repite el destello', () => {
    render(<CieloConstelacion estado={estado} />);
    expect(window.localStorage.getItem('agon_constelacion_vista')).toBe(`${estado.semana}:3`);
  });
});

describe('estrellaNueva', () => {
  it('la estrella que se enciende con destello es la nueva desde la última visita', () => {
    expect(estrellaNueva(null, '2026-11-16', 3)).toBe(2);
    expect(estrellaNueva('2026-11-16:2', '2026-11-16', 3)).toBe(2);
    expect(estrellaNueva('2026-11-16:3', '2026-11-16', 3)).toBeNull();
    expect(estrellaNueva('2026-11-09:5', '2026-11-16', 1)).toBe(0); // semana nueva
    expect(estrellaNueva(null, '2026-11-16', 0)).toBeNull();
  });
});
