import { describe, expect, it } from 'vitest';
import { ALTO_CIELO, ANCHO_CIELO, CONSTELACIONES } from '@/lib/constelaciones';
import { estadoConstelacion, textoConstelacion } from './constelacion';

// Semana de ejemplo: lunes 16 a domingo 22 de noviembre de 2026.
const L = '2026-11-16';
const M = '2026-11-17';
const X = '2026-11-18';
const J = '2026-11-19';
const V = '2026-11-20';
const S = '2026-11-21';
const D = '2026-11-22';
const tramo = (dias: number[], vigenteDesde = '2026-01-01') => ({ dias, vigenteDesde });

describe('datos de las constelaciones', () => {
  it('una por cada cantidad de días, con tantas estrellas como días, dentro del espacio de 100 × 92', () => {
    for (let dias = 1; dias <= 7; dias++) {
      const c = CONSTELACIONES[dias]!;
      expect(c.dias).toBe(dias);
      expect(c.estrellas).toHaveLength(dias);
      for (const [x, y] of c.estrellas) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(ANCHO_CIELO);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(ALTO_CIELO);
      }
      for (const [a, b] of c.lineas) {
        expect(a).toBeLessThan(dias);
        expect(b).toBeLessThan(dias);
      }
      expect(c.mito.length).toBeGreaterThan(10);
    }
    expect(Object.values(CONSTELACIONES).map((c) => c.nombre)).toEqual([
      'Estrella Polar',
      'Cástor y Pólux',
      'Cinturón de Orión',
      'Gran Cuadrado de Pegaso',
      'Casiopea',
      'La Lira',
      'Osa Mayor',
    ]);
    expect(CONSTELACIONES[1]!.anillos).toEqual([16, 24]);
  });
});

describe('estadoConstelacion', () => {
  it.each([
    [[3], 'Estrella Polar'],
    [[1, 4], 'Cástor y Pólux'],
    [[1, 3, 5], 'Cinturón de Orión'],
    [[1, 2, 4, 5], 'Gran Cuadrado de Pegaso'],
    [[1, 2, 3, 4, 5], 'Casiopea'],
    [[1, 2, 3, 4, 5, 6], 'La Lira'],
    [[1, 2, 3, 4, 5, 6, 7], 'Osa Mayor'],
  ])('%j días → %s, sin importar qué días sean', (dias, nombre) => {
    const estado = estadoConstelacion({ hoy: L, historialDias: [tramo(dias)], fechasConSesion: [] });
    expect(estado.constelacion.nombre).toBe(nombre);
    expect(estado.total).toBe(dias.length);
  });

  it('semana vacía: todo apagado', () => {
    const estado = estadoConstelacion({ hoy: V, historialDias: [tramo([1, 3, 5])], fechasConSesion: [] });
    expect(estado.encendidas).toBe(0);
    expect(estado.lineasEncendidas).toEqual([false, false]);
    expect(estado.completa).toBe(false);
    expect(estado.estrellaFugaz).toBe(false);
    expect(textoConstelacion(estado)).toBe('0 de 3 estrellas');
  });

  it('parcial: cada día planificado entrenado enciende la siguiente estrella; la línea, cuando sus dos estrellas lo están', () => {
    const estado = estadoConstelacion({ hoy: V, historialDias: [tramo([1, 2, 3, 4, 5])], fechasConSesion: [L, M, J] });
    expect(estado.constelacion.nombre).toBe('Casiopea');
    expect(estado.encendidas).toBe(3);
    expect(estado.lineasEncendidas).toEqual([true, true, false, false]);
    expect(textoConstelacion(estado)).toBe('3 de 5 estrellas');
  });

  it('completa: todas las estrellas y las figuras cerradas se cierran con la última (Pegaso)', () => {
    const casi = estadoConstelacion({ hoy: J, historialDias: [tramo([1, 2, 3, 4])], fechasConSesion: [L, M, X] });
    expect(casi.lineasEncendidas).toEqual([true, true, false, false]);
    const completa = estadoConstelacion({ hoy: J, historialDias: [tramo([1, 2, 3, 4])], fechasConSesion: [L, M, X, J] });
    expect(completa.completa).toBe(true);
    expect(completa.lineasEncendidas).toEqual([true, true, true, true]);
  });

  it('la Lira y la Osa Mayor también se cierran justo con la última estrella', () => {
    for (const dias of [[1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6, 7]]) {
      const fechas = [L, M, X, J, V, S, D].slice(0, dias.length);
      const antes = estadoConstelacion({ hoy: D, historialDias: [tramo(dias)], fechasConSesion: fechas.slice(0, -1) });
      expect(antes.lineasEncendidas.every(Boolean)).toBe(false);
      const despues = estadoConstelacion({ hoy: D, historialDias: [tramo(dias)], fechasConSesion: fechas });
      expect(despues.lineasEncendidas.every(Boolean)).toBe(true);
    }
  });

  it('día extra (no planificado): estrella fugaz hoy y ninguna estrella encendida', () => {
    const estado = estadoConstelacion({ hoy: M, historialDias: [tramo([1, 3, 5])], fechasConSesion: [M] });
    expect(estado.encendidas).toBe(0);
    expect(estado.estrellaFugaz).toBe(true);
    expect(estado.diasExtra).toBe(1);
    // Al día siguiente ya no hay estrella fugaz (fue una vez, ese día).
    expect(estadoConstelacion({ hoy: X, historialDias: [tramo([1, 3, 5])], fechasConSesion: [M] }).estrellaFugaz).toBe(false);
  });

  it('cambio de días a mitad de semana: la figura cambia desde ese momento y cuentan los días planificados ya entrenados', () => {
    // Hasta el miércoles entrenaba L-X-V (Orión); desde el jueves, de lunes a viernes (Casiopea).
    const historialDias = [tramo([1, 3, 5]), tramo([1, 2, 3, 4, 5], J)];
    const estado = estadoConstelacion({ hoy: V, historialDias, fechasConSesion: [L, M, X, J] });
    expect(estado.constelacion.nombre).toBe('Casiopea');
    // L y X eran planificados; M no (con los días de ese momento); J sí (con los nuevos).
    expect(estado.encendidas).toBe(3);
    expect(estado.diasExtra).toBe(1);
    // Y al bajar de días, nunca se encienden más estrellas que las de la figura.
    const menos = estadoConstelacion({
      hoy: V,
      historialDias: [tramo([1, 2, 3, 4, 5]), tramo([5], V)],
      fechasConSesion: [L, M, X],
    });
    expect(menos.constelacion.nombre).toBe('Estrella Polar');
    expect(menos.encendidas).toBe(1);
    expect(menos.completa).toBe(true);
  });

  it('paso de domingo a lunes: la semana reinicia con la constelación apagada', () => {
    const fechas = [L, M, X, J, V];
    const domingo = estadoConstelacion({ hoy: D, historialDias: [tramo([1, 2, 3, 4, 5])], fechasConSesion: fechas });
    expect(domingo.semana).toBe(L);
    expect(domingo.completa).toBe(true);
    const lunes = estadoConstelacion({ hoy: '2026-11-23', historialDias: [tramo([1, 2, 3, 4, 5])], fechasConSesion: fechas });
    expect(lunes.semana).toBe('2026-11-23');
    expect(lunes.encendidas).toBe(0);
    expect(lunes.completa).toBe(false);
  });

  it('las sesiones de otras semanas y las de días futuros no cuentan', () => {
    const estado = estadoConstelacion({
      hoy: M,
      historialDias: [tramo([1, 2, 3])],
      fechasConSesion: ['2026-11-13', '2026-11-14', L, X],
    });
    expect(estado.encendidas).toBe(1);
  });

  it('una estrella: "1 de 1 estrella"', () => {
    const estado = estadoConstelacion({ hoy: X, historialDias: [tramo([3])], fechasConSesion: [X] });
    expect(textoConstelacion(estado)).toBe('1 de 1 estrella');
    expect(estado.completa).toBe(true);
  });
});
