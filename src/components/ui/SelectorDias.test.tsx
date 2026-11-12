import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { TarjetaRacha } from '@/components/gym/TarjetaRacha';
import { SelectorDias } from './SelectorDias';

function Prueba({ inicial = [] as number[], error }: { inicial?: number[]; error?: string }) {
  const [dias, setDias] = useState(inicial);
  return (
    <>
      <SelectorDias valor={dias} alCambiar={setDias} error={error} />
      <output data-testid="dias">{dias.join(',')}</output>
    </>
  );
}

afterEach(cleanup);

describe('SelectorDias', () => {
  it('es un grupo de siete botones con el nombre completo de cada día y ninguno elegido', () => {
    render(<Prueba />);
    const grupo = screen.getByRole('group', { name: '¿Qué días sueles entrenar?' });
    expect(grupo).toBeInTheDocument();
    for (const dia of ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']) {
      expect(screen.getByRole('button', { name: dia })).toHaveAttribute('aria-pressed', 'false');
    }
    expect(screen.getByText(/Tu racha solo cuenta estos días/)).toBeInTheDocument();
  });

  it('marca y desmarca días (aria-pressed) y los guarda ordenados', () => {
    render(<Prueba />);
    fireEvent.click(screen.getByRole('button', { name: 'viernes' }));
    fireEvent.click(screen.getByRole('button', { name: 'lunes' }));
    expect(screen.getByRole('button', { name: 'lunes' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('dias')).toHaveTextContent('1,5');
    fireEvent.click(screen.getByRole('button', { name: 'viernes' }));
    expect(screen.getByTestId('dias')).toHaveTextContent(/^1$/);
  });

  it('los accesos rápidos eligen los días de una vez', () => {
    render(<Prueba />);
    fireEvent.click(screen.getByRole('button', { name: 'Lunes a viernes' }));
    expect(screen.getByTestId('dias')).toHaveTextContent('1,2,3,4,5');
    expect(screen.getByRole('button', { name: 'Lunes a viernes' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '3 días (L-X-V)' }));
    expect(screen.getByTestId('dias')).toHaveTextContent('1,3,5');
    fireEvent.click(screen.getByRole('button', { name: 'Todos los días' }));
    expect(screen.getByTestId('dias')).toHaveTextContent('1,2,3,4,5,6,7');
    fireEvent.click(screen.getByRole('button', { name: 'Lunes a sábado' }));
    expect(screen.getByTestId('dias')).toHaveTextContent('1,2,3,4,5,6');
  });

  it('se usa con el teclado: flechas, Inicio y Fin mueven el foco', () => {
    render(<Prueba />);
    const lunes = screen.getByRole('button', { name: 'lunes' });
    lunes.focus();
    fireEvent.keyDown(lunes, { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: 'martes' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(screen.getByRole('button', { name: 'domingo' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(lunes).toHaveFocus();
    fireEvent.keyDown(lunes, { key: 'ArrowLeft' });
    expect(screen.getByRole('button', { name: 'domingo' })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(lunes).toHaveFocus();
  });

  it('muestra el error al no elegir ninguno', () => {
    render(<Prueba error="Elige al menos un día" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Elige al menos un día');
  });
});

describe('TarjetaRacha', () => {
  const base = { actual: 3, mejor: 5, hoyEsDescanso: false, proximoDiaPlanificado: '2026-12-10' };

  it('día de descanso: "Hoy descansas: tu racha sigue" y el próximo entrenamiento', () => {
    render(<TarjetaRacha racha={{ ...base, hoyEsDescanso: true }} diasElegidos={[1, 3, 5]} entrenoHoy={false} />);
    expect(screen.getByText('Hoy descansas: tu racha sigue')).toBeInTheDocument();
    expect(screen.getByText('Próximo entrenamiento: jueves')).toBeInTheDocument();
    expect(screen.getByText('3 días')).toBeInTheDocument();
    expect(screen.getByText('5 días')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Tus días de entrenamiento' })).toHaveTextContent('LlunesXmiércolesVviernes');
  });

  it('día planificado sin sesión: "Hoy toca entrenar"', () => {
    render(<TarjetaRacha racha={base} diasElegidos={[1, 3, 5]} entrenoHoy={false} />);
    expect(screen.getByText('Hoy toca entrenar')).toBeInTheDocument();
  });

  it('si ya entrenó hoy: "Hoy ya entrenaste ✓"', () => {
    render(<TarjetaRacha racha={base} diasElegidos={[1, 3, 5]} entrenoHoy />);
    expect(screen.getByText('Hoy ya entrenaste ✓')).toBeInTheDocument();
  });
});
