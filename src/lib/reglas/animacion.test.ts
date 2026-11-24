import { afterEach, describe, expect, it, vi } from 'vitest';
import { esNivelAnimacion, leerNivel, nivelEfectivo, SCRIPT_NIVEL, vibrar } from './animacion';
import { estadoLlama, etiquetaLlama, intensidadDeRacha, rachaEnRiesgo } from './llama';

describe('niveles de animación', () => {
  it('leerNivel acepta los tres niveles y vuelve a "completas" ante cualquier otra cosa', () => {
    expect(leerNivel('suaves')).toBe('suaves');
    expect(leerNivel('minimas')).toBe('minimas');
    expect(leerNivel('completas')).toBe('completas');
    expect(leerNivel('extremas')).toBe('completas');
    expect(leerNivel(null)).toBe('completas');
    expect(esNivelAnimacion('suaves')).toBe(true);
    expect(esNivelAnimacion(3)).toBe(false);
  });

  it('si el sistema pide reducir el movimiento, el nivel efectivo es "minimas" aunque se haya elegido otro', () => {
    expect(nivelEfectivo('completas', false)).toBe('completas');
    expect(nivelEfectivo('suaves', false)).toBe('suaves');
    expect(nivelEfectivo('completas', true)).toBe('minimas');
    expect(nivelEfectivo('suaves', true)).toBe('minimas');
  });

  describe('vibración', () => {
    afterEach(() => vi.unstubAllGlobals());
    it('solo si está activada y el nivel no es "minimas"', () => {
      const vibrate = vi.fn();
      Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
      vibrar('completas', true, 15);
      vibrar('suaves', true);
      vibrar('minimas', true);
      vibrar('completas', false);
      expect(vibrate).toHaveBeenCalledTimes(2);
      expect(vibrate).toHaveBeenCalledWith(15);
    });
  });

  describe('script del <head> (sin parpadeo)', () => {
    const ejecutar = (cookie: string, reduce: boolean) => {
      for (const parte of document.cookie.split(';')) document.cookie = `${parte.split('=')[0]!.trim()}=; max-age=0; path=/`;
      for (const parte of cookie.split(';').filter(Boolean)) document.cookie = `${parte.trim()}; path=/`;
      window.matchMedia = ((consulta: string) => ({ matches: consulta.includes('reduce') && reduce, addEventListener: () => {} })) as never;
      new Function(SCRIPT_NIVEL)();
      return { ...document.documentElement.dataset };
    };

    it('lee la cookie y la preferencia del sistema', () => {
      expect(ejecutar('', false)).toMatchObject({ animacion: 'completas', movimiento: 'completas', vibracion: 'si' });
      expect(ejecutar('kairos_animacion=suaves;kairos_vibracion=0', false)).toMatchObject({ animacion: 'suaves', movimiento: 'suaves', vibracion: 'no' });
      expect(ejecutar('kairos_animacion=completas', true)).toMatchObject({ animacion: 'completas', movimiento: 'minimas' });
      expect(ejecutar('kairos_animacion=raro', false)).toMatchObject({ animacion: 'completas', movimiento: 'completas' });
    });
  });
});

describe('la llama de la racha', () => {
  it.each([
    [0, 'brasa', 0, false],
    [1, 'pequena', 0, false],
    [2, 'pequena', 0, false],
    [3, 'media', 3, false],
    [6, 'media', 3, false],
    [7, 'grande', 4, true],
    [29, 'grande', 4, true],
    [30, 'legendaria', 5, true],
    [120, 'legendaria', 5, true],
  ] as const)('racha %i: %s, %i chispas, halo %s', (racha, intensidad, chispas, halo) => {
    expect(intensidadDeRacha(racha)).toBe(intensidad);
    expect(estadoLlama(racha)).toMatchObject({ intensidad, chispas, halo });
  });

  it('en riesgo la llama se ve más baja (salvo la brasa)', () => {
    expect(estadoLlama(5, true).escala).toBeLessThan(estadoLlama(5).escala);
    expect(estadoLlama(0, true).escala).toBe(estadoLlama(0).escala);
  });

  it('en riesgo: día planificado, sin entrenar y después del mediodía, con racha', () => {
    const base = { racha: 4, hoyEsDescanso: false, entrenoHoy: false, hora: 15 };
    expect(rachaEnRiesgo(base)).toBe(true);
    expect(rachaEnRiesgo({ ...base, hora: 9 })).toBe(false);
    expect(rachaEnRiesgo({ ...base, entrenoHoy: true })).toBe(false);
    expect(rachaEnRiesgo({ ...base, hoyEsDescanso: true })).toBe(false);
    expect(rachaEnRiesgo({ ...base, racha: 0 })).toBe(false);
  });

  it('la etiqueta dice la racha', () => {
    expect(etiquetaLlama(0)).toBe('Racha apagada: entrena para encenderla');
    expect(etiquetaLlama(1)).toBe('Racha de 1 día');
    expect(etiquetaLlama(12)).toBe('Racha de 12 días');
  });
});
