import { beforeEach, describe, expect, it } from 'vitest';
import { instalarAlmacenamiento } from '@/test/almacenamiento';
import { CLAVES_ANTERIORES, COOKIES_ANTERIORES, guardarLocal, leerLocal } from './almacenamiento';
import { SCRIPT_NIVEL } from './reglas/animacion';

let almacen: Storage;
beforeEach(() => {
  almacen = instalarAlmacenamiento();
});

describe('migración suave de las claves del navegador (Agón → Kairós)', () => {
  it.each(Object.entries(CLAVES_ANTERIORES))('%s: si no existe, toma el valor de %s y borra la anterior', (nueva, anterior) => {
    almacen.setItem(anterior, '2026-11-24');
    expect(leerLocal(nueva, almacen)).toBe('2026-11-24');
    expect(almacen.getItem(nueva)).toBe('2026-11-24');
    expect(almacen.getItem(anterior)).toBeNull();
  });

  it('si la clave nueva ya existe, manda la nueva (y no toca la anterior)', () => {
    almacen.setItem('kairos_museo_visto', '1');
    almacen.setItem('agon_museo_visto', '0');
    expect(leerLocal('kairos_museo_visto', almacen)).toBe('1');
    expect(almacen.getItem('agon_museo_visto')).toBe('0');
  });

  it('sin ninguna de las dos, null; una clave sin anterior, también', () => {
    expect(leerLocal('kairos_intro_dia', almacen)).toBeNull();
    expect(leerLocal('otra_clave', almacen)).toBeNull();
  });

  it('nadie vuelve a ver la intro del día ni la insignia "Nuevo" por el cambio de nombre', () => {
    almacen.setItem('agon_intro_dia', '2026-11-24');
    almacen.setItem('agon_museo_visto', '1');
    expect(leerLocal('kairos_intro_dia', almacen)).toBe('2026-11-24');
    expect(leerLocal('kairos_museo_visto', almacen)).toBe('1');
  });

  it('sin almacenamiento (bloqueado), no falla: lee null y guardar devuelve false', () => {
    const bloqueado = instalarAlmacenamiento({ bloqueado: true });
    expect(leerLocal('kairos_intro_dia', bloqueado)).toBeNull();
    expect(guardarLocal('kairos_intro_dia', 'x', bloqueado)).toBe(false);
    expect(leerLocal('kairos_intro_dia', null)).toBeNull();
  });
});

describe('cookies del nivel de animación', () => {
  const ejecutar = () => {
    window.matchMedia = ((consulta: string) => ({ matches: false, media: consulta, addEventListener: () => {} })) as never;
    new Function(SCRIPT_NIVEL)();
    return { ...document.documentElement.dataset };
  };
  const limpiar = () => {
    for (const parte of document.cookie.split(';')) document.cookie = `${parte.split('=')[0]!.trim()}=; max-age=0; path=/`;
  };

  it('el script del <head> lee la cookie anterior si falta la nueva, la copia y borra la anterior', () => {
    limpiar();
    document.cookie = `${COOKIES_ANTERIORES.kairos_animacion}=suaves; path=/`;
    document.cookie = `${COOKIES_ANTERIORES.kairos_vibracion}=0; path=/`;
    expect(ejecutar()).toMatchObject({ animacion: 'suaves', vibracion: 'no' });
    expect(document.cookie).toContain('kairos_animacion=suaves');
    expect(document.cookie).toContain('kairos_vibracion=0');
    expect(document.cookie).not.toContain(`${COOKIES_ANTERIORES.kairos_animacion}=`);
  });

  it('con la cookie nueva, la usa', () => {
    limpiar();
    document.cookie = 'kairos_animacion=minimas; path=/';
    expect(ejecutar()).toMatchObject({ animacion: 'minimas', movimiento: 'minimas' });
  });
});
