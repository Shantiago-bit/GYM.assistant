import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import nextConfig from '../../../next.config';
import { revisarBasico, revisarConAxe } from '@/test/accesibilidad';
import { instalarAlmacenamiento } from '@/test/almacenamiento';
import { CLAVE_MUSEO_VISTO, galeriaDeMeses } from '@/lib/reglas/museo';
import { IndiceSalas } from './IndiceSalas';
import { PiezaRecord } from './PiezaRecord';

beforeEach(() => instalarAlmacenamiento());
afterEach(cleanup);

describe('/gym/resumen → /gym/museo', () => {
  it('redirección permanente (308): los enlaces viejos y la guía siguen funcionando', async () => {
    const redirecciones = await nextConfig.redirects!();
    expect(redirecciones).toContainEqual({ source: '/gym/resumen', destination: '/gym/museo', permanent: true });
  });
});

describe('galeriaDeMeses', () => {
  it('el mes en curso siempre (aunque no tenga sesiones) y los anteriores con sesiones, del más reciente al más antiguo', () => {
    const cuadros = galeriaDeMeses(['2026-09-02', '2026-09-02', '2026-09-10', '2026-10-05', '2026-12-01'], '2026-11-22');
    expect(cuadros).toEqual([
      { mes: '2026-11', dias: 0, actual: true },
      { mes: '2026-10', dias: 1, actual: false },
      { mes: '2026-09', dias: 2, actual: false },
    ]);
    expect(galeriaDeMeses([], '2026-11-22')).toHaveLength(1);
    const muchos = Array.from({ length: 20 }, (_, i) => `20${String(25 - Math.floor(i / 12)).padStart(2, '0')}-${String((i % 12) + 1).padStart(2, '0')}-01`);
    expect(galeriaDeMeses(muchos, '2026-11-22', 12)).toHaveLength(12);
  });
});

describe('salas del museo', () => {
  it('el índice lleva a las tres salas (chips en móvil y lateral en escritorio) y apaga la insignia "Nuevo"', async () => {
    const { container } = render(<IndiceSalas />);
    const chips = screen.getByRole('navigation', { name: 'Salas del museo' });
    expect(within(chips).getAllByRole('link').map((enlace) => enlace.getAttribute('href'))).toEqual([
      '#sala-records',
      '#sala-meses',
      '#sala-archivo',
    ]);
    const lateral = screen.getByRole('navigation', { name: 'Índice del museo' });
    expect(within(lateral).getAllByRole('link').map((enlace) => enlace.textContent)).toEqual([
      'Sala de récords',
      'Galería de meses',
      'Archivo',
    ]);
    expect(within(lateral).getByRole('link', { name: 'Sala de récords' })).toHaveAttribute('aria-current', 'location');
    expect(window.localStorage.getItem(CLAVE_MUSEO_VISTO)).toBe('1');
    expect(await revisarConAxe(container)).toEqual([]);
  });

  it('cada récord es una pieza sobre un pedestal decorativo, con el ejercicio, la marca y la fecha', async () => {
    const { container } = render(
      <ul>
        <PiezaRecord
          avanzado={false}
          record={{
            ejercicioId: 'e1',
            nombre: 'Press de banca',
            tipo: 'peso',
            mayorPeso: { valor: 60000, reps: 8, fecha: '2026-11-19', nuevo: true },
            mejor1RM: { valor: 76000, fecha: '2026-11-19', nuevo: true },
          }}
        />
        <PiezaRecord
          avanzado
          record={{ ejercicioId: 'e2', nombre: 'Dominadas', tipo: 'calistenia', maxReps: { valor: 12, fecha: '2026-10-02', nuevo: false }, variante: null }}
        />
      </ul>,
    );
    expect(screen.getByRole('heading', { name: 'Press de banca', level: 3 })).toBeInTheDocument();
    expect(container).toHaveTextContent('Mayor peso');
    expect(container).toHaveTextContent('12 reps');
    expect(container.querySelectorAll('.pedestal-museo[aria-hidden="true"]')).toHaveLength(2);
    expect(revisarBasico(container)).toEqual([]);
    expect(await revisarConAxe(container)).toEqual([]);
  });
});
