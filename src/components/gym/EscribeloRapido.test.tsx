import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revisarBasico, revisarConAxe } from '@/test/accesibilidad';

const mocks = vi.hoisted(() => ({ enviarJson: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh, replace: vi.fn() }) }));
vi.mock('@/lib/http/cliente', () => ({ enviarJson: mocks.enviarJson }));

import { FormularioSeries } from './FormularioSeries';

const formulario = (tipo: 'peso' | 'calistenia' = 'peso') => (
  <FormularioSeries
    tipo={tipo}
    urlEnvio="/api/x"
    destino="/gym"
    textoBoton="Guardar sesión"
    pesoInicialKg={tipo === 'peso' ? 40 : null}
    fechaMaxima="2026-11-13"
    avanzado
  />
);

const escribir = (texto: string) => fireEvent.change(screen.getByLabelText('Escríbelo rápido'), { target: { value: texto } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
afterEach(cleanup);

describe('"Escríbelo rápido" en el formulario de series', () => {
  it('muestra la vista previa en vivo como chips y "Usar estas series" llena las filas SIN guardar', () => {
    render(formulario());
    escribir('3x10 62,5 rir 2');
    const chips = within(screen.getByRole('list', { name: 'Vista previa de las series' })).getAllByRole('listitem');
    expect(chips).toHaveLength(3);
    expect(chips[0]).toHaveTextContent('Serie 1: 10 reps × 62,5 kg · RIR 2');

    fireEvent.click(screen.getByRole('button', { name: 'Usar estas series' }));
    expect(screen.getAllByRole('spinbutton', { name: /Repeticiones de la serie/ }).map((campo) => (campo as HTMLInputElement).value)).toEqual([
      '10',
      '10',
      '10',
    ]);
    expect((screen.getByRole('spinbutton', { name: 'Peso en kilos de la serie 1' }) as HTMLInputElement).value).toBe('62.5');
    expect(screen.getByText(/revisa las filas de abajo y guarda cuando quieras/)).toBeInTheDocument();
    // Nada se envió: guardar sigue siendo un paso aparte.
    expect(mocks.enviarJson).not.toHaveBeenCalled();
  });

  it('sin peso usa el actual y lo avisa', () => {
    render(formulario());
    escribir('10, 8, 7');
    expect(screen.getByText('Usé tu peso actual (40 kg) porque no escribiste el peso.')).toBeInTheDocument();
  });

  it('si no lo entiende, muestra 3 ejemplos (que se pueden tocar) y ofrece que CHRONO lo interprete', async () => {
    render(formulario());
    escribir('hice pecho hoy');
    const ejemplos = within(screen.getByRole('list', { name: 'Ejemplos' })).getAllByRole('button');
    expect(ejemplos).toHaveLength(3);
    fireEvent.click(ejemplos[0]!);
    expect((screen.getByLabelText('Escríbelo rápido') as HTMLInputElement).value).toBe('3x10 40');

    escribir('cuatro series de diez con cuarenta');
    mocks.enviarJson.mockResolvedValue({
      ok: true,
      datos: { series: [{ reps: 10, pesoGramos: 40000, rir: null, tecnica: 'normal' }], avisos: [] },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Que CHRONO lo interprete' }));
    });
    expect(mocks.enviarJson).toHaveBeenCalledWith('/api/gym/interpretar', {
      texto: 'cuatro series de diez con cuarenta',
      tipo: 'peso',
      pesoActualKg: 40,
    });
    expect(screen.getByText('Lo interpretó CHRONO: revísalo antes de usarlo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Usar estas series' })).toBeInTheDocument();
  });

  it('en libras no ofrece CHRONO: pide escribirlo en kg', () => {
    render(formulario());
    escribir('3x10 100 lb');
    expect(screen.getByText(/Escribe el peso en kilos/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Que CHRONO lo interprete' })).toBeNull();
  });

  it('sin reconocimiento de voz en el navegador, el micrófono no aparece', () => {
    render(formulario());
    expect(screen.queryByRole('button', { name: 'Dictar las series' })).toBeNull();
  });

  it('con reconocimiento de voz, el micrófono dicta en es-CO, muestra "Escuchando" y pasa el texto por el intérprete', () => {
    type Instancia = { lang: string; start: () => void; stop: () => void; onresult: ((e: unknown) => void) | null; onend: (() => void) | null };
    const instancias: Instancia[] = [];
    vi.stubGlobal(
      'webkitSpeechRecognition',
      class {
        lang = '';
        interimResults = true;
        maxAlternatives = 3;
        onresult: ((e: unknown) => void) | null = null;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        start = vi.fn();
        stop = vi.fn();
        constructor() {
          instancias.push(this);
        }
      },
    );
    const instancia = () => instancias.at(-1)!;
    render(formulario('calistenia'));
    const microfono = screen.getByRole('button', { name: 'Dictar las series' });
    fireEvent.click(microfono);
    expect(instancia().lang).toBe('es-CO');
    expect(screen.getByRole('button', { name: 'Dejar de escuchar' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Escuchando')).toBeInTheDocument();
    act(() => {
      instancia().onresult!({ results: [[{ transcript: '8 7 6 la última al fallo' }]] });
      instancia().onend!();
    });
    expect((screen.getByLabelText('Escríbelo rápido') as HTMLInputElement).value).toBe('8 7 6 la última al fallo');
    expect(screen.getAllByRole('listitem').map((chip) => chip.textContent)).toEqual([
      'Serie 1: 8 reps',
      'Serie 2: 7 reps',
      'Serie 3: 6 reps · RIR 0',
    ]);
  });

  it('pasa axe-core y la revisión básica con la vista previa abierta', async () => {
    render(formulario());
    escribir('3x10 40');
    expect(revisarBasico(document.body)).toEqual([]);
    expect(await revisarConAxe(document.body)).toEqual([]);
  });
});
