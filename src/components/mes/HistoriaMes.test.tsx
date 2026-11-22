import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { revisarBasico, revisarConAxe } from '@/test/accesibilidad';
import type { ResumenMes } from '@/lib/reglas/resumenMes';

const movimiento = vi.hoisted(() => ({ reducir: false }));
vi.mock('framer-motion', async (original) => ({
  ...(await original<typeof import('framer-motion')>()),
  useReducedMotion: () => movimiento.reducir,
}));

import { CompartirMes, urlImagenMes } from './CompartirMes';
import { HistoriaMes } from './HistoriaMes';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  movimiento.reducir = false;
});

const RESUMEN: ResumenMes = {
  mes: '2026-11',
  sesiones: 12,
  dias: 9,
  mejorRacha: 4,
  records: [{ ejercicioId: 'e1', nombre: 'Press de banca', tipo: 'peso', fecha: '2026-11-04', pesoGramos: 62500, reps: 9 }],
  totalRecords: 1,
  estrella: { ejercicioId: 'e1', nombre: 'Press de banca', sesiones: 6 },
  volumenKg: 5400,
  anterior: { sesiones: 9, dias: 7, volumenKg: 4000 },
};

const tarjetaActual = () => screen.getByLabelText(/^Tarjeta \d de 5/).getAttribute('aria-label');

describe('historia del mes', () => {
  it('todo el contenido está en una lista para lectores de pantalla', () => {
    render(<HistoriaMes resumen={RESUMEN} />);
    const items = within(screen.getByRole('list', { name: 'Resumen del mes' })).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveTextContent('Tu mes de noviembre: 9 días entrenados en 12 sesiones.');
    expect(items[2]).toHaveTextContent('1 récord personal: Press de banca, 62,5 kg × 9.');
    expect(items[4]).toHaveTextContent('3 más que en octubre');
  });

  it('se recorre con las flechas y con Anterior / Siguiente', () => {
    render(<HistoriaMes resumen={RESUMEN} />);
    const historia = screen.getByLabelText(/^Tarjeta 1 de 5/);
    historia.focus();
    fireEvent.keyDown(historia, { key: 'ArrowRight' });
    expect(tarjetaActual()).toMatch(/^Tarjeta 2 de 5/);
    fireEvent.keyDown(screen.getByLabelText(/^Tarjeta 2 de 5/), { key: 'ArrowLeft' });
    expect(tarjetaActual()).toMatch(/^Tarjeta 1 de 5/);
    expect(screen.getByRole('button', { name: /Anterior/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(tarjetaActual()).toMatch(/^Tarjeta 3 de 5/);
  });

  it('avanza sola y se puede pausar', () => {
    vi.useFakeTimers();
    render(<HistoriaMes resumen={RESUMEN} />);
    act(() => {
      vi.advanceTimersByTime(6100);
    });
    expect(tarjetaActual()).toMatch(/^Tarjeta 2 de 5/);
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(tarjetaActual()).toMatch(/^Tarjeta 2 de 5/);
    expect(screen.getByRole('button', { name: 'Reproducir' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('con movimiento reducido empieza en pausa (no avanza sola)', () => {
    movimiento.reducir = true;
    vi.useFakeTimers();
    render(<HistoriaMes resumen={RESUMEN} />);
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(tarjetaActual()).toMatch(/^Tarjeta 1 de 5/);
    expect(screen.getByRole('button', { name: 'Reproducir' })).toBeInTheDocument();
  });

  it('la historia y el bloque para compartir pasan axe-core y la revisión básica', async () => {
    render(
      <main>
        <h1>Tu mes en el gym</h1>
        <HistoriaMes resumen={RESUMEN} />
        <CompartirMes mes="2026-11" />
      </main>,
    );
    expect(revisarBasico(document.body)).toEqual([]);
    expect(await revisarConAxe(document.body)).toEqual([]);
  });
});

describe('compartir', () => {
  it('los interruptores empiezan apagados y cambian la URL de la imagen', () => {
    render(<CompartirMes mes="2026-11" />);
    const imagen = screen.getByRole('img', { name: 'Vista previa de la imagen para compartir' });
    expect(imagen).toHaveAttribute('src', '/api/gym/mi-mes/imagen?mes=2026-11');
    const apodo = screen.getByRole('switch', { name: 'Mostrar mi apodo' });
    expect(apodo).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('switch', { name: 'Mostrar pesos de mis récords' })).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(apodo);
    expect(imagen).toHaveAttribute('src', '/api/gym/mi-mes/imagen?mes=2026-11&apodo=1');
    expect(urlImagenMes('2026-11', { apodo: false, pesos: true })).toBe('/api/gym/mi-mes/imagen?mes=2026-11&pesos=1');
  });

  it('sin navigator.share solo ofrece descargar', () => {
    render(<CompartirMes mes="2026-11" />);
    expect(screen.queryByRole('button', { name: 'Compartir' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Descargar imagen' })).toHaveAttribute('download', 'mi-mes-2026-11.png');
  });
});
