// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { calcularPrimerosPasos, type DatosPrimerosPasos } from '@/lib/reglas/guia';

const NADA: DatosPrimerosPasos = {
  ejercicios: 0,
  conPruebaInicial: false,
  sesiones: 0,
  maxSesionesPorEjercicio: 0,
  entrenamientoConVarios: false,
  usoChat: false,
};

const TODO: DatosPrimerosPasos = {
  ejercicios: 2,
  conPruebaInicial: true,
  sesiones: 4,
  maxSesionesPorEjercicio: 2,
  entrenamientoConVarios: true,
  usoChat: true,
};

describe('calcularPrimerosPasos', () => {
  it('devuelve los seis pasos en orden, con título, descripción y enlace', () => {
    const { pasos, total } = calcularPrimerosPasos(NADA);

    expect(total).toBe(6);
    expect(pasos.map((paso) => paso.id)).toEqual([
      'crear_ejercicio',
      'prueba_inicial',
      'primera_sesion',
      'recomendacion',
      'entrenamiento_hoy',
      'preguntar_chrono',
    ]);
    expect(pasos[0]).toMatchObject({ href: '/gym/ejercicios/nuevo', hecho: false });
    expect(pasos[5]).toMatchObject({ href: '/gym/chat' });
    for (const paso of pasos) {
      expect(paso.titulo.length).toBeGreaterThan(0);
      expect(paso.descripcion.length).toBeGreaterThan(0);
    }
  });

  it('una cuenta nueva no tiene pasos hechos y el siguiente es crear un ejercicio', () => {
    const resultado = calcularPrimerosPasos(NADA);

    expect(resultado).toMatchObject({ completados: 0, porcentaje: 0, todosHechos: false });
    expect(resultado.siguiente?.id).toBe('crear_ejercicio');
  });

  it('marca cada paso según los datos y calcula el porcentaje', () => {
    const resultado = calcularPrimerosPasos({ ...NADA, ejercicios: 1, conPruebaInicial: true, sesiones: 1, maxSesionesPorEjercicio: 1 });

    expect(resultado.pasos.filter((paso) => paso.hecho).map((paso) => paso.id)).toEqual([
      'crear_ejercicio',
      'prueba_inicial',
      'primera_sesion',
    ]);
    expect(resultado).toMatchObject({ completados: 3, porcentaje: 50 });
    expect(resultado.siguiente?.id).toBe('recomendacion');
  });

  it('seguir la recomendación exige una segunda sesión del mismo ejercicio', () => {
    expect(calcularPrimerosPasos({ ...TODO, maxSesionesPorEjercicio: 1 }).pasos[3]?.hecho).toBe(false);
    expect(calcularPrimerosPasos({ ...TODO, maxSesionesPorEjercicio: 2 }).pasos[3]?.hecho).toBe(true);
  });

  it('el siguiente paso es el primero pendiente, aunque haya hechos después', () => {
    const resultado = calcularPrimerosPasos({ ...NADA, usoChat: true });

    expect(resultado.completados).toBe(1);
    expect(resultado.siguiente?.id).toBe('crear_ejercicio');
  });

  it('con todo hecho no hay siguiente paso y el avance es del 100 %', () => {
    expect(calcularPrimerosPasos(TODO)).toMatchObject({ completados: 6, porcentaje: 100, todosHechos: true, siguiente: null });
  });
});
