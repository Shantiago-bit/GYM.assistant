import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GLOSARIO } from '@/lib/textos/glosario';
import { Termino } from './Termino';

afterEach(cleanup);

describe('Termino', () => {
  it('muestra el término y un "?" cerrado (aria-expanded=false) con nombre accesible', () => {
    render(<Termino id="rir" />);
    expect(screen.getByText('RIR')).toBeInTheDocument();
    const boton = screen.getByRole('button', { name: '¿Qué es RIR?' });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(GLOSARIO.rir.explicacion)).not.toBeVisible();
  });

  it('al tocar el "?" abre el globo con la explicación y el ejemplo; tocarlo de nuevo lo cierra', () => {
    render(<Termino id="rir" />);
    const boton = screen.getByRole('button', { name: '¿Qué es RIR?' });
    fireEvent.click(boton);
    expect(boton).toHaveAttribute('aria-expanded', 'true');
    const globo = document.getElementById(boton.getAttribute('aria-controls')!);
    expect(globo).toBeVisible();
    expect(globo).toHaveTextContent(GLOSARIO.rir.explicacion);
    expect(globo).toHaveTextContent(`Ejemplo: ${GLOSARIO.rir.ejemplo}`);
    expect(globo).toHaveTextContent('repeticiones que te quedaron en reserva');
    fireEvent.click(boton);
    expect(boton).toHaveAttribute('aria-expanded', 'false');
  });

  it('Esc lo cierra y devuelve el foco al "?"', () => {
    render(<Termino id="unorm" />);
    const boton = screen.getByRole('button', { name: '¿Qué es 1RM?' });
    boton.focus();
    fireEvent.click(boton);
    expect(boton).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(boton).toHaveFocus();
  });

  it('tocar fuera lo cierra', () => {
    render(
      <>
        <Termino id="descarga" />
        <p>Fuera</p>
      </>,
    );
    const boton = screen.getByRole('button', { name: '¿Qué es Descarga?' });
    fireEvent.click(boton);
    fireEvent.pointerDown(screen.getByText('Fuera'));
    expect(boton).toHaveAttribute('aria-expanded', 'false');
  });

  it('acepta un texto propio en lugar del término', () => {
    render(<Termino id="rango">Rango 8–12 reps</Termino>);
    expect(screen.getByText('Rango 8–12 reps')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '¿Qué es Rango?' })).toBeInTheDocument();
  });
});
