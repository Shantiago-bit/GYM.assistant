import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), enviarJson: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock('@/lib/http/cliente', () => ({ enviarJson: mocks.enviarJson }));

import { FormularioEjercicio, validarFormularioEjercicio } from './FormularioEjercicio';
import { FormularioSeries, filasIniciales, validarFilas } from './FormularioSeries';

// El mensaje que anuncia un campo: el texto del elemento que nombra su aria-describedby.
const descripcion = (campo: HTMLElement) =>
  (campo.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.enviarJson.mockResolvedValue({ ok: true, datos: { id: 'nuevo', logro: null } });
});
afterEach(cleanup);

describe('validación de las series', () => {
  it('cada error dice qué serie y qué campo arreglar', () => {
    const filas = filasIniciales(3, null);
    filas[0] = { ...filas[0]!, reps: '10', kg: '40' };
    filas[1] = { ...filas[1]!, reps: '2.5', kg: '-3', rir: '12' };
    filas[2] = { ...filas[2]!, reps: '8', kg: '40', tipoSerie: 'drop_set', miniReps: '4 3', miniKg: '30' };
    expect(validarFilas(filas, 'peso')).toEqual([
      { indice: 1, campo: 'reps', mensaje: 'Las repeticiones de la serie 2 van en número entero, de 0 a 1000; por ejemplo 10.' },
      { indice: 1, campo: 'kg', mensaje: 'El peso de la serie 2 va de 0 a 2000 kg, por ejemplo 40 o 42,5.' },
      { indice: 1, campo: 'rir', mensaje: 'Las repeticiones que te quedaron en la serie 2 van de 0 a 10. Si no lo sabes, déjalo vacío.' },
      { indice: 2, campo: 'miniKg', mensaje: 'Serie 3: escribe un peso por cada bajada (2), por ejemplo "40 30".' },
    ]);
    expect(validarFilas(filasIniciales(1, null), 'calistenia')).toEqual([
      { indice: 0, campo: 'reps', mensaje: 'Escribe cuántas repeticiones hiciste en la serie 1.' },
    ]);
  });

  it('el formulario marca cada campo con aria-invalid, el mensaje en aria-describedby y lleva el foco al primero', async () => {
    render(
      <FormularioSeries tipo="peso" urlEnvio="/api/x" destino="/gym" textoBoton="Guardar" pesoInicialKg={40} cantidadSeries={2} />,
    );
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Repeticiones de la serie 1' }), { target: { value: '10' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Peso en kilos de la serie 2' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    const reps2 = screen.getByRole('spinbutton', { name: 'Repeticiones de la serie 2' });
    const kg2 = screen.getByRole('spinbutton', { name: 'Peso en kilos de la serie 2' });
    expect(reps2).toHaveAttribute('aria-invalid', 'true');
    expect(kg2).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('spinbutton', { name: 'Repeticiones de la serie 1' })).toHaveAttribute('aria-invalid', 'false');
    expect(descripcion(reps2)).toBe('Escribe cuántas repeticiones hiciste en la serie 2.');
    expect(descripcion(kg2)).toBe('Escribe el peso en kilos de la serie 2, por ejemplo 40 o 42,5.');
    await waitFor(() => expect(reps2).toHaveFocus());
    expect(screen.getByRole('status')).toHaveTextContent('Faltan corregir 2 datos: están marcados en rojo.');
    expect(mocks.enviarJson).not.toHaveBeenCalled();

    // Al corregir el campo, su error desaparece.
    fireEvent.change(reps2, { target: { value: '9' } });
    expect(reps2).toHaveAttribute('aria-invalid', 'false');
    expect(kg2).toHaveAttribute('aria-invalid', 'true');
  });

  it('en el modo sencillo, un error del RIR abre "Más detalles" de esa serie', async () => {
    render(<FormularioSeries tipo="calistenia" urlEnvio="/api/x" destino="/gym" textoBoton="Guardar" pesoInicialKg={null} cantidadSeries={1} />);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Repeticiones de la serie 1' }), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Más detalles de la serie 1' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: /Repeticiones que te quedaron en la serie 1/ }), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Más detalles de la serie 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    const rir = screen.getByRole('spinbutton', { name: /Repeticiones que te quedaron en la serie 1/ });
    expect(rir).toBeVisible();
    await waitFor(() => expect(rir).toHaveFocus());
    expect(descripcion(rir)).toContain('van de 0 a 10');
  });
});

describe('validación al crear un ejercicio', () => {
  const base = { nombre: 'Press', tipo: 'peso' as const, pesoRefKg: '', nivel: '', rangoMin: '8', rangoMax: '12' };

  it('mensajes que dicen cómo arreglarlo', () => {
    expect(validarFormularioEjercicio(base, false)).toEqual({});
    expect(validarFormularioEjercicio(base, true)).toEqual({
      pesoRefKg: 'Escribe el peso con el que empiezas, en kilos; por ejemplo 40.',
    });
    expect(validarFormularioEjercicio({ ...base, nombre: ' ', rangoMin: '12', rangoMax: '8' }, false)).toEqual({
      nombre: 'Escribe el nombre del ejercicio, por ejemplo Press de banca.',
      rangoMin: 'El mínimo (12) no puede ser mayor que el máximo (8): bájalo o sube el máximo.',
    });
  });

  it('sin nombre: aria-invalid, mensaje junto al campo y foco en él', async () => {
    render(<FormularioEjercicio />);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));
    const nombre = screen.getByLabelText('Nombre');
    expect(nombre).toHaveAttribute('aria-invalid', 'true');
    expect(descripcion(nombre)).toBe('Escribe el nombre del ejercicio, por ejemplo Press de banca.');
    await waitFor(() => expect(nombre).toHaveFocus());
    expect(mocks.enviarJson).not.toHaveBeenCalled();
  });

  it('en el modo sencillo, un error en las opciones avanzadas las abre y enfoca el campo', async () => {
    render(<FormularioEjercicio />);
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Remo' } });
    fireEvent.change(screen.getByLabelText('Repeticiones máximas'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));
    const maximo = screen.getByLabelText('Repeticiones máximas');
    expect(maximo.closest('details')).toHaveAttribute('open');
    await waitFor(() => expect(maximo).toHaveFocus());
    expect(descripcion(maximo)).toContain('Escribe las repeticiones máximas');
  });

  it('un nombre repetido se marca en el campo del nombre', async () => {
    mocks.enviarJson.mockResolvedValue({ ok: false, codigo: 'EJERCICIO_DUPLICADO', mensaje: 'Ya existe un ejercicio con ese nombre.' });
    render(<FormularioEjercicio />);
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Remo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));
    const nombre = screen.getByLabelText('Nombre');
    await waitFor(() => expect(nombre).toHaveAttribute('aria-invalid', 'true'));
    expect(descripcion(nombre)).toBe('Ya tienes un ejercicio con ese nombre: usa otro.');
  });
});
