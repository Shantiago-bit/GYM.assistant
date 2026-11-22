// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  DESPLAZAMIENTO,
  DURACION,
  ESCALONADO_MAXIMO,
  aparecer,
  aparecerEscalonado,
  retrasoEscalonado,
  suavizarSalida,
  valorDelContador,
} from '@/lib/movimiento';

describe('tokens de movimiento', () => {
  it('duraciones, desplazamiento y escalonado dentro de lo pedido', () => {
    expect(DURACION).toEqual({ rapida: 0.15, base: 0.25, lenta: 0.4 });
    expect(DESPLAZAMIENTO).toBeGreaterThanOrEqual(8);
    expect(DESPLAZAMIENTO).toBeLessThanOrEqual(12);
    expect(aparecer.oculto).toEqual({ opacity: 0, y: DESPLAZAMIENTO });
    expect(aparecerEscalonado.visible).toEqual({ transition: { staggerChildren: 0.05 } });
  });

  it('solo los primeros 8 hijos esperan su turno; el resto aparece sin retraso', () => {
    expect(retrasoEscalonado(0)).toBe(0);
    expect(retrasoEscalonado(1)).toBe(0.05);
    expect(retrasoEscalonado(ESCALONADO_MAXIMO - 1)).toBe(0.35);
    expect(retrasoEscalonado(ESCALONADO_MAXIMO)).toBe(0);
    expect(retrasoEscalonado(40)).toBe(0);
  });

  it('el contador sale de 0, frena al final y termina exactamente en el valor', () => {
    expect(suavizarSalida(0)).toBe(0);
    expect(suavizarSalida(1)).toBe(1);
    expect(suavizarSalida(2)).toBe(1);
    expect(valorDelContador(120, 0)).toBe(0);
    expect(valorDelContador(120, 300)).toBeGreaterThan(60); // a mitad de tiempo ya pasó la mitad (curva de salida)
    expect(valorDelContador(120, 600)).toBe(120);
    expect(valorDelContador(120, 5000)).toBe(120);
    expect(valorDelContador(7, 100, 0)).toBe(7);
  });
});
