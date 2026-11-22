import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { revisarBasico, revisarConAxe } from '@/test/accesibilidad';
import type { Sesion } from '@/lib/dataService';
import { recomendarSiguiente } from '@/lib/reglas/progresion';
import { DetallePorque } from './DetallePorque';

afterEach(cleanup);

const recomendacion = recomendarSiguiente({
  tipo: 'peso',
  rango: [8, 12],
  pesoActualGramos: 60000,
  metaRepsActual: 12,
  repsPorSerie: [12, 12, 11],
  pesosPorSerie: [60000, 60000, 60000],
  rirPorSerie: [2, 1, 0],
});

const SESIONES: Sesion[] = [
  { id: 's4', fecha: '2026-11-18', esPrueba: false, series: [{ numero: 1, reps: 12, pesoGramos: 60000, rir: 2 }, { numero: 2, reps: 11, pesoGramos: 60000, rir: 0 }] },
  { id: 's3', fecha: '2026-11-14', esPrueba: false, series: [{ numero: 1, reps: 11, pesoGramos: 60000, rir: null }] },
  { id: 's2', fecha: '2026-11-10', esPrueba: false, series: [{ numero: 1, reps: 10, pesoGramos: 60000, rir: null }] },
  { id: 's1', fecha: '2026-11-06', esPrueba: true, series: [{ numero: 1, reps: 9, pesoGramos: 60000, rir: null }] },
];

describe('"¿Por qué?" de la recomendación', () => {
  it('empieza cerrado y se abre y se cierra con el teclado (aria-expanded)', () => {
    render(<DetallePorque porque={recomendacion.porque} sesiones={SESIONES} />);
    const boton = screen.getByRole('button', { name: /¿Por qué\?/ });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('La regla')).toBeNull();

    boton.focus();
    act(() => {
      fireEvent.click(boton); // Intro o Espacio en un <button> disparan click
    });
    expect(boton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('La regla')).toBeInTheDocument();
    expect(boton).toHaveFocus();

    act(() => {
      fireEvent.click(boton);
    });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
  });

  it('las evidencias dicen con texto si cumplen (no solo con color), y la tabla muestra las 3 últimas sesiones', () => {
    render(<DetallePorque porque={recomendacion.porque} sesiones={SESIONES} />);
    fireEvent.click(screen.getByRole('button', { name: /¿Por qué\?/ }));
    const evidencias = within(screen.getByRole('region', { name: 'Lo que se tuvo en cuenta' })).getAllByRole('listitem');
    expect(evidencias[0]).toHaveTextContent('Serie 1: 12 de 12 repeticiones con 60 kg (cumple)');
    expect(evidencias[2]).toHaveTextContent('Serie 3: 11 de 12 repeticiones con 60 kg (no cumple)');
    const filas = within(screen.getByRole('table', { name: 'Tus últimas sesiones' })).getAllByRole('row');
    expect(filas).toHaveLength(4); // encabezado + 3 sesiones
    expect(filas[1]).toHaveTextContent('12, 11 con 60 kg');
    expect(screen.getByText(recomendacion.porque.regla)).toBeInTheDocument();
  });

  it('abierto pasa axe-core y la revisión básica', async () => {
    render(<DetallePorque porque={recomendacion.porque} sesiones={SESIONES} />);
    fireEvent.click(screen.getByRole('button', { name: /¿Por qué\?/ }));
    expect(revisarBasico(document.body)).toEqual([]);
    expect(await revisarConAxe(document.body)).toEqual([]);
  });
});
