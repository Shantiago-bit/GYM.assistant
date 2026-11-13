import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), enviarJson: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock('@/lib/http/cliente', () => ({ enviarJson: mocks.enviarJson }));

import { FormularioEjercicio } from './FormularioEjercicio';
import { FormularioSeries } from './FormularioSeries';

// Campos que se ven (los de un <details> cerrado o un contenedor oculto no cuentan).
const camposVisibles = () =>
  [...screen.queryAllByRole('textbox'), ...screen.queryAllByRole('spinbutton'), ...screen.queryAllByRole('radio')].filter(
    (campo) => campo.closest('details:not([open])') === null && campo.closest('[hidden]') === null,
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.enviarJson.mockResolvedValue({ ok: true, datos: { id: 'nuevo' } });
});
afterEach(cleanup);

describe('crear ejercicio en el modo sencillo', () => {
  it('solo pide el nombre y si es con peso o con tu cuerpo; el resto está en "Opciones avanzadas (opcional)", cerrado', () => {
    render(<FormularioEjercicio />);
    expect(screen.getByLabelText('Nombre')).toBeVisible();
    const tipo = screen.getByRole('group', { name: '¿Con peso o con tu cuerpo?' });
    expect(within(tipo).getByRole('radio', { name: /Con peso/ })).toBeChecked();
    expect(within(tipo).getByRole('radio', { name: /Con tu cuerpo/ })).not.toBeChecked();
    // Nombre + los dos radios del tipo.
    expect(camposVisibles()).toHaveLength(3);
    const opciones = screen.getByText('Opciones avanzadas (opcional)').closest('details')!;
    expect(opciones).not.toHaveAttribute('open');
    expect(screen.queryByText('RIR')).not.toBeInTheDocument();
  });

  it('crea el ejercicio con los valores por defecto (ganar músculo, series rectas, 8 a 12) y lleva a la primera medición', async () => {
    render(<FormularioEjercicio />);
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Press de banca' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/gym/ejercicios/nuevo/prueba'));
    expect(mocks.enviarJson).toHaveBeenCalledWith('/api/gym/ejercicios', {
      nombre: 'Press de banca',
      tipo: 'peso',
      enfoque: 'hipertrofia',
      metodo: 'rectas',
      pesoRefKg: 0,
      rangoMin: 8,
      rangoMax: 12,
    });
  });

  it('con tu cuerpo: calistenia, sin peso y 8 a 15 repeticiones', async () => {
    render(<FormularioEjercicio />);
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Dominadas' } });
    fireEvent.click(screen.getByRole('radio', { name: /Con tu cuerpo/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

    await waitFor(() => expect(mocks.enviarJson).toHaveBeenCalled());
    expect(mocks.enviarJson.mock.calls[0]![1]).toEqual({
      nombre: 'Dominadas',
      tipo: 'calistenia',
      enfoque: 'hipertrofia',
      metodo: 'rectas',
      nivel: '',
      rangoMin: 8,
      rangoMax: 15,
    });
  });

  it('en el modo avanzado se ven el enfoque, el método, el peso y el rango, con el "?" del glosario', () => {
    render(<FormularioEjercicio avanzado />);
    expect(screen.queryByText('Opciones avanzadas (opcional)')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Enfoque/ })).toBeVisible();
    expect(screen.getByRole('group', { name: /Método de series/ })).toBeVisible();
    expect(screen.getByLabelText('Peso de referencia inicial (kg)')).toBeVisible();
    expect(screen.getByRole('button', { name: '¿Qué es Enfoque?' })).toBeInTheDocument();
  });
});

describe('registrar series en el modo sencillo', () => {
  const formulario = (avanzado = false) =>
    render(
      <FormularioSeries
        tipo="peso"
        urlEnvio="/api/gym/ejercicios/e1/prueba"
        destino="/gym/ejercicios/e1"
        textoBoton="Guardar mi primera medición"
        pesoInicialKg={null}
        cantidadSeries={2}
        avanzado={avanzado}
      />,
    );

  it('cada serie muestra solo Repeticiones y Peso (kg); el RIR y la técnica están ocultos', () => {
    formulario();
    expect(screen.getAllByRole('spinbutton', { name: /^Repeticiones de la serie/ })).toHaveLength(2);
    expect(screen.getAllByRole('spinbutton', { name: /^Peso en kilos de la serie/ })).toHaveLength(2);
    expect(screen.queryByRole('spinbutton', { name: /Repeticiones que te quedaron/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(camposVisibles()).toHaveLength(4);
    // Ninguna serie de calentamiento se agrega sola.
    expect(screen.queryByText('Calentamiento')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar serie 1' })).toHaveTextContent('Quitar');
  });

  it('"Más detalles" de una serie muestra su RIR y su técnica', () => {
    formulario();
    const mas = screen.getByRole('button', { name: 'Más detalles de la serie 2' });
    expect(mas).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(mas);
    expect(mas).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('spinbutton', { name: 'Repeticiones que te quedaron en la serie 2 (opcional)' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Cómo la hiciste (serie 2)' })).toBeVisible();
    expect(screen.queryByRole('combobox', { name: 'Cómo la hiciste (serie 1)' })).not.toBeInTheDocument();
  });

  it('el calentamiento solo se agrega al pedirlo y arranca con sus detalles abiertos', () => {
    formulario();
    fireEvent.click(screen.getByRole('button', { name: '+ Serie de calentamiento' }));
    expect(screen.getByText('Calentamiento')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Cómo la hiciste (serie 1)' })).toHaveValue('aproximacion');
  });

  it('sin repeticiones, el mensaje dice qué serie falta y cómo arreglarlo', async () => {
    formulario();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Repeticiones de la serie 1' }), { target: { value: '10' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Peso en kilos de la serie 1' }), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar mi primera medición' }));
    expect(await screen.findByText('Escribe cuántas repeticiones hiciste en la serie 2.')).toBeInTheDocument();
    expect(mocks.enviarJson).not.toHaveBeenCalled();
  });

  it('guarda solo repeticiones y peso, sin tocar las opciones avanzadas', async () => {
    mocks.enviarJson.mockResolvedValue({ ok: true, datos: { logro: null } });
    formulario();
    for (const numero of [1, 2]) {
      fireEvent.change(screen.getByRole('spinbutton', { name: `Repeticiones de la serie ${numero}` }), { target: { value: '9' } });
      fireEvent.change(screen.getByRole('spinbutton', { name: `Peso en kilos de la serie ${numero}` }), { target: { value: '40' } });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Guardar mi primera medición' }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/gym/ejercicios/e1'));
    expect(mocks.enviarJson).toHaveBeenCalledWith('/api/gym/ejercicios/e1/prueba', {
      series: [
        { reps: 9, pesoKg: 40, tipoSerie: 'normal' },
        { reps: 9, pesoKg: 40, tipoSerie: 'normal' },
      ],
    });
  });

  it('en el modo avanzado el RIR y la técnica están a la vista', () => {
    formulario(true);
    expect(screen.getByRole('spinbutton', { name: 'RIR en la serie 1 (opcional)' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Técnica (serie 1)' })).toBeVisible();
    expect(screen.getByRole('button', { name: '+ Aproximación' })).toBeInTheDocument();
  });
});
