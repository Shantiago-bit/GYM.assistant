import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNivelMovimiento } from '@/components/ui/ProveedorMovimiento';
import { revisarBasico, revisarConAxe } from '@/test/accesibilidad';
import { instalarAlmacenamiento } from '@/test/almacenamiento';
import { EfectosPuntero } from './EfectosPuntero';
import { Llama } from './Llama';
import { SelectorAnimacion } from './SelectorAnimacion';

const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), enviarJson: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock('@/lib/http/cliente', () => ({ enviarJson: mocks.enviarJson }));

import { FormularioSeries } from '@/components/gym/FormularioSeries';

let sistemaReduce = false;
let punteroFino = true;

function ponerNivel(nivel: string) {
  const d = document.documentElement.dataset;
  d.animacion = nivel;
  d.movimiento = sistemaReduce ? 'minimas' : nivel;
  d.vibracion = 'si';
}

beforeEach(() => {
  vi.clearAllMocks();
  sistemaReduce = false;
  punteroFino = true;
  instalarAlmacenamiento();
  window.matchMedia = ((consulta: string) => ({
    matches: (consulta.includes('reduce') && sistemaReduce) || (consulta.includes('pointer: fine') && punteroFino),
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  })) as unknown as typeof window.matchMedia;
  ponerNivel('completas');
  mocks.enviarJson.mockResolvedValue({ ok: true, datos: { id: 'nuevo', logro: null } });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function MostrarNivel() {
  const { nivel, elegido, sistemaReduce: reduce } = useNivelMovimiento();
  return <p data-testid="nivel">{`${nivel}|${elegido}|${reduce}`}</p>;
}

describe('useNivelMovimiento', () => {
  it.each(['completas', 'suaves', 'minimas'])('expone el nivel "%s" elegido', (nivel) => {
    ponerNivel(nivel);
    render(<MostrarNivel />);
    expect(screen.getByTestId('nivel')).toHaveTextContent(`${nivel}|${nivel}|false`);
  });

  it('con la preferencia del sistema, el efectivo es "minimas" aunque se haya elegido "completas"', () => {
    sistemaReduce = true;
    ponerNivel('completas');
    render(<MostrarNivel />);
    expect(screen.getByTestId('nivel')).toHaveTextContent('minimas|completas|true');
  });
});

describe('SelectorAnimacion', () => {
  it('guarda el nivel, deja la cookie y cambia el nivel de la página al instante', async () => {
    render(
      <>
        <SelectorAnimacion nivelInicial="completas" vibracionInicial />
        <MostrarNivel />
      </>,
    );
    fireEvent.click(screen.getByRole('radio', { name: /Suaves/ }));
    expect(screen.getByTestId('nivel')).toHaveTextContent('suaves|suaves|false');
    expect(document.cookie).toContain('agon_animacion=suaves');
    await waitFor(() => expect(mocks.enviarJson).toHaveBeenCalledWith('/api/gym/perfil/animacion', { nivel: 'suaves', vibracion: true }));
    expect(await screen.findByText('Listo: guardado.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /Vibración breve/ }));
    await waitFor(() => expect(mocks.enviarJson).toHaveBeenLastCalledWith('/api/gym/perfil/animacion', { nivel: 'suaves', vibracion: false }));
    expect(document.cookie).toContain('agon_vibracion=0');
  });

  it('si falla, vuelve a como estaba', async () => {
    mocks.enviarJson.mockResolvedValue({ ok: false, mensaje: 'Sin conexión' });
    render(<SelectorAnimacion nivelInicial="completas" vibracionInicial />);
    fireEvent.click(screen.getByRole('radio', { name: /Mínimas/ }));
    expect(await screen.findByText('No se pudo guardar: Sin conexión')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Completas/ })).toBeChecked();
    expect(document.documentElement.dataset.animacion).toBe('completas');
  });

  it('explica cuando el sistema pide reducir el movimiento, y pasa axe', async () => {
    sistemaReduce = true;
    const { container } = render(<SelectorAnimacion nivelInicial="completas" vibracionInicial />);
    expect(screen.getByText(/Tu sistema pide reducir el movimiento/)).toBeInTheDocument();
    expect(await revisarConAxe(container)).toEqual([]);
  });
});

describe('EfectosPuntero', () => {
  const montarTarjeta = () =>
    render(
      <>
        <EfectosPuntero />
        <div data-inclinar data-testid="tarjeta">
          Tarjeta
        </div>
      </>,
    );
  const mover = (elemento: Element) => {
    vi.spyOn(elemento, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
    const evento = new MouseEvent('pointermove', { bubbles: true, clientX: 190, clientY: 10 });
    Object.defineProperty(evento, 'pointerType', { value: 'mouse' });
    elemento.dispatchEvent(evento);
  };

  it('con puntero fino y "Completas", la tarjeta se inclina hacia el cursor (variables CSS, sin pintar React)', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((paso) => {
      paso(0);
      return 1;
    });
    montarTarjeta();
    const tarjeta = screen.getByTestId('tarjeta');
    mover(tarjeta);
    expect(tarjeta.style.getPropertyValue('--ry')).toBe('5.40deg');
    expect(tarjeta.style.getPropertyValue('--rx')).toBe('4.80deg');
    expect(tarjeta).toHaveAttribute('data-inclinando');
  });

  it.each([
    ['puntero grueso', () => (punteroFino = false)],
    ['nivel "Suaves"', () => ponerNivel('suaves')],
    ['nivel "Mínimas"', () => ponerNivel('minimas')],
  ])('no existe con %s', (_nombre, preparar) => {
    preparar();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((paso) => {
      paso(0);
      return 1;
    });
    montarTarjeta();
    const tarjeta = screen.getByTestId('tarjeta');
    mover(tarjeta);
    expect(tarjeta.style.getPropertyValue('--ry')).toBe('');
  });
});

describe('Llama', () => {
  it('imagen con la racha como nombre, y su intensidad', () => {
    render(
      <>
        <Llama racha={0} />
        <Llama racha={8} />
        <Llama racha={31} />
      </>,
    );
    expect(screen.getByRole('img', { name: 'Racha apagada: entrena para encenderla' })).toHaveAttribute('data-intensidad', 'brasa');
    expect(screen.getByRole('img', { name: 'Racha de 8 días' })).toHaveAttribute('data-intensidad', 'grande');
    expect(screen.getByRole('img', { name: 'Racha de 31 días' })).toHaveAttribute('data-intensidad', 'legendaria');
    expect(screen.getByRole('img', { name: 'Racha de 8 días' }).querySelectorAll('.llama-chispa')).toHaveLength(4);
    expect(revisarBasico(document.body)).toEqual([]);
  });

  it('se pausa con la pestaña oculta', () => {
    render(<Llama racha={5} />);
    const llama = screen.getByRole('img');
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(llama).toHaveAttribute('data-pausada');
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('crece y suelta chispas cuando la racha subió desde la última visita', () => {
    window.localStorage.setItem('agon_racha_vista', '3');
    render(<Llama racha={4} celebrar />);
    expect(screen.getByRole('img')).toHaveAttribute('data-crece');
    expect(screen.getByRole('img').querySelectorAll('.llama-rafaga').length).toBeGreaterThan(0);
    expect(window.localStorage.getItem('agon_racha_vista')).toBe('4');
  });

  it('estática fuera de "Completas": todo su movimiento está bajo html[data-movimiento="completas"]', () => {
    const css = readFileSync(path.resolve(__dirname, '../../app/globals.css'), 'utf8');
    const reglasConAnimacion = css
      .split('\n')
      .filter((linea) => /\.(llama|mancuerna)[^{]*\{[^}]*animation:/.test(linea) && !/animation: none/.test(linea));
    expect(reglasConAnimacion.length).toBeGreaterThan(5);
    for (const regla of reglasConAnimacion) expect(regla).toMatch(/^html\[data-movimiento='completas'\]/);
  });
});

describe('Llama: capas, escala y estática', () => {
  it('monta sus tres capas dentro del grupo de escala, separado del svg que "crece"', () => {
    render(<Llama racha={5} tamano={48} />);
    const llama = screen.getByRole('img');
    const escala = llama.querySelector('.llama-escala')!;
    expect(escala).not.toBeNull();
    for (const capa of ['.llama-exterior', '.llama-media', '.llama-nucleo']) expect(escala.querySelector(capa)).not.toBeNull();
    expect(llama.style.getPropertyValue('--escala-llama')).toBe('0.85');
  });

  it.each([
    [0, 'brasa'],
    [2, 'pequena'],
    [4, 'media'],
    [9, 'grande'],
    [45, 'legendaria'],
  ])('racha %i: data-intensidad="%s"', (racha, intensidad) => {
    render(<Llama racha={racha} />);
    expect(screen.getByRole('img')).toHaveAttribute('data-intensidad', intensidad);
  });

  it('las chispas no desaparecen en una llama de 18 px: su radio crece en unidades del viewBox', () => {
    render(<Llama racha={8} tamano={18} />);
    const radio = Number(screen.getByRole('img').querySelector('.llama-chispa')!.getAttribute('r'));
    expect((radio / 64) * 18).toBeGreaterThanOrEqual(1.4);
  });

  it.each(['minimas', 'suaves'])('estática en "%s" (sin animación ni "crece")', (nivel) => {
    ponerNivel(nivel);
    window.localStorage.setItem('agon_racha_vista', '1');
    render(<Llama racha={5} celebrar />);
    expect(screen.getByRole('img')).toHaveAttribute('data-estatica');
    expect(screen.getByRole('img')).not.toHaveAttribute('data-crece');
  });

  it('estática con movimiento reducido del sistema, aunque se haya elegido "Completas"', () => {
    sistemaReduce = true;
    ponerNivel('completas');
    render(<Llama racha={5} />);
    expect(screen.getByRole('img')).toHaveAttribute('data-estatica');
  });

  it('en "Completas" se anima', () => {
    render(<Llama racha={5} />);
    expect(screen.getByRole('img')).not.toHaveAttribute('data-estatica');
  });
});

describe('la mancuerna al registrar', () => {
  const montar = () =>
    render(<FormularioSeries tipo="peso" urlEnvio="/api/x" destino="/gym" textoBoton="Guardar sesión" pesoInicialKg={40} cantidadSeries={1} />);

  it('al agregar una serie, hace un levantamiento y sale "+1 serie" (solo "Completas")', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar serie' }));
    expect(screen.getByTestId('levanta-serie')).toHaveTextContent('+1 serie');
    expect(screen.getByTestId('levanta-serie').querySelector('.mancuerna')).toHaveAttribute('data-estado', 'levanta');
    cleanup();
    ponerNivel('minimas');
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar serie' }));
    expect(screen.queryByTestId('levanta-serie')).toBeNull();
  });

  it('al guardar: la petición sale de inmediato y la animación solo acompaña la espera', async () => {
    let responder: (valor: unknown) => void = () => {};
    mocks.enviarJson.mockReturnValue(new Promise((resolver) => (responder = resolver)));
    montar();
    fireEvent.change(screen.getAllByLabelText(/Repeticiones/)[0]!, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar sesión' }));
    // La petición ya salió, sin esperar a ninguna animación.
    expect(mocks.enviarJson).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('guardado-central').querySelector('.mancuerna')).toHaveAttribute('data-estado', 'esfuerzo');
    await act(async () => responder({ ok: true, datos: { id: 's1', logro: null } }));
    expect(screen.getByTestId('guardado-central').querySelector('.mancuerna')).toHaveAttribute('data-estado', 'listo');
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/gym'));
  });
});
