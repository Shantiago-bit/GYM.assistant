import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { constelacionDe } from '@/lib/constelaciones';
import type { DatosCuadro } from '@/lib/reglas/cuadroMes';
import { revisarBasico, revisarConAxe } from '@/test/accesibilidad';
import { GaleriaCuadros } from './GaleriaCuadros';

afterEach(cleanup);

// Datos inventados.
const cuadro = (mes: string, extra: Partial<DatosCuadro> = {}): DatosCuadro => ({
  mes,
  actual: false,
  ultimoDia: `${mes}-30`,
  dias: 12,
  sesiones: 14,
  volumenKg: 8450,
  mejorRacha: 9,
  records: [{ fecha: `${mes}-12`, nombre: 'Press de banca', marca: '62,5 kg × 9' }],
  estrella: { nombre: 'Sentadilla', sesiones: 6 },
  estrellas: [
    { fecha: `${mes}-03`, x: 20, y: 60, radio: 1.5, records: [] },
    { fecha: `${mes}-12`, x: 40, y: 70, radio: 2, records: [{ nombre: 'Press de banca', marca: '62,5 kg × 9' }] },
  ],
  constelaciones: [{ lunes: `${mes}-02`, constelacion: constelacionDe(3), x: 30, y: 24, escala: 0.2 }],
  semanasCompletasSeguidas: 1,
  regreso: false,
  primerMes: false,
  tono: 10,
  titulo: 'El mes del récord',
  ...extra,
});

describe('GaleriaCuadros', () => {
  it('cada cuadro es un botón con aria-pressed y el resumen; al tocarlo se voltea y muestra las cifras', () => {
    const { container } = render(<GaleriaCuadros cuadros={[cuadro('2026-10')]} hoy="2026-11-24" />);
    const boton = screen.getByRole('button', { name: /^El cielo de octubre de 2026: El mes del récord\. 12 días · 1 récord · racha de 9/ });
    expect(boton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('El mes del récord')).toBeInTheDocument();
    expect(container.querySelector('.lienzo-mes')).toHaveAttribute('data-tono', '10');
    expect(container.querySelectorAll('.lienzo-constelacion line')).toHaveLength(2);

    fireEvent.click(boton);
    expect(container.querySelector('.cuadro-marco')).toHaveAttribute('data-volteado');
    const volver = screen.getByRole('button', { name: /^Ver el cuadro\. El cielo de octubre/ });
    expect(volver).toHaveAttribute('aria-pressed', 'true');
    expect(document.activeElement).toBe(volver);
    const reverso = container.querySelector('.cuadro-reverso') as HTMLElement;
    expect(within(reverso).getByText('8.450 kg')).toBeInTheDocument();
    expect(within(reverso).getByText('62,5 kg × 9')).toBeInTheDocument();
    expect(within(reverso).getByRole('link', { name: 'Ver la historia' })).toHaveAttribute('href', '/gym/mi-mes?mes=2026-10');
    expect(within(reverso).getByRole('link', { name: 'Compartir' })).toHaveAttribute('href', '/gym/mi-mes?mes=2026-10#compartir');

    fireEvent.click(volver);
    expect(container.querySelector('.cuadro-marco')).not.toHaveAttribute('data-volteado');
  });

  it('la estrella de un récord es un botón con nombre que abre un globo con fecha, ejercicio y marca', () => {
    render(<GaleriaCuadros cuadros={[cuadro('2026-10')]} hoy="2026-11-24" />);
    const estrella = screen.getByRole('button', { name: /^Récord del 12 de octubre: Press de banca, 62,5 kg × 9/ });
    fireEvent.click(estrella);
    expect(estrella).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Press de banca: 62,5 kg × 9');
  });

  it('el mes en curso es un cuadro "en proceso", con el lienzo velado y "Se completa el…"', () => {
    const { container } = render(
      <GaleriaCuadros cuadros={[cuadro('2026-11', { actual: true, ultimoDia: '2026-11-30', titulo: 'Noviembre, en movimiento' })]} hoy="2026-11-10" />,
    );
    expect(screen.getByText('Se completa el 30 de noviembre')).toBeInTheDocument();
    expect(container.querySelector('.lienzo-velo')).not.toBeNull();
    // Sin meses anteriores: el marco vacío.
    expect(screen.getByText('Tu primer cuadro se pinta cuando completes tu primer mes')).toBeInTheDocument();
  });

  it('con más de 12 meses, filtro por año; y flechas Anterior/Siguiente', () => {
    const meses = Array.from({ length: 14 }, (_, i) => {
      const fecha = new Date(Date.UTC(2026, 10 - i, 1));
      return cuadro(fecha.toISOString().slice(0, 7));
    });
    render(<GaleriaCuadros cuadros={meses} hoy="2026-11-24" />);
    const anio = screen.getByLabelText('Año');
    fireEvent.change(anio, { target: { value: '2025' } });
    expect(screen.getAllByRole('button', { name: /^El cielo de .* de 2025/ })).toHaveLength(3);
    expect(screen.queryAllByRole('button', { name: /de 2026:/ })).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeInTheDocument();
  });

  it('pasa axe y la revisión básica (frente y reverso)', async () => {
    const { container } = render(<GaleriaCuadros cuadros={[cuadro('2026-10'), cuadro('2026-09', { records: [], estrellas: [] })]} hoy="2026-11-24" />);
    expect(revisarBasico(container)).toEqual([]);
    expect(await revisarConAxe(container)).toEqual([]);
    fireEvent.click(screen.getAllByRole('button', { name: /^El cielo de/ })[0]!);
    expect(await revisarConAxe(container)).toEqual([]);
  });
});
