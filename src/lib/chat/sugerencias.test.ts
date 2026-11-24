// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { estaEstancado, PREGUNTAS_POR_TEMA, sugerenciasInteligentes, type EjercicioParaSugerir } from './sugerencias';

const HOY = '2026-11-23';
const ejercicio = (e: Partial<EjercicioParaSugerir> & { nombre: string }): EjercicioParaSugerir => ({
  listo: false,
  marcas: [],
  ...e,
});
const textos = (d: Parameters<typeof sugerenciasInteligentes>[0]) => sugerenciasInteligentes(d).map((s) => s.texto);

describe('sugerenciasInteligentes', () => {
  it('sin ejercicios: lo primero es crear la primera rutina', () => {
    const lista = textos({ hoy: HOY, estadoHoy: 'entrenar', ejercicios: [] });
    expect(lista[0]).toBe('Ayúdame a crear mi primera rutina');
    expect(lista).not.toContain('¿Qué entreno hoy?');
    expect(lista).toHaveLength(3);
  });

  it('hoy es día planificado sin sesión: «¿Qué entreno hoy?»', () => {
    expect(textos({ hoy: HOY, estadoHoy: 'entrenar', ejercicios: [ejercicio({ nombre: 'Press' })] })[0]).toBe('¿Qué entreno hoy?');
    expect(textos({ hoy: HOY, estadoHoy: 'descanso', ejercicios: [ejercicio({ nombre: 'Press' })] })).not.toContain('¿Qué entreno hoy?');
    expect(textos({ hoy: HOY, estadoHoy: 'entrenado', ejercicios: [ejercicio({ nombre: 'Press' })] })).not.toContain('¿Qué entreno hoy?');
  });

  it('ejercicio listo para subir: «¿Por qué me toca subir en <ejercicio>?»', () => {
    const lista = textos({ hoy: HOY, estadoHoy: 'descanso', ejercicios: [ejercicio({ nombre: 'Remo' }), ejercicio({ nombre: 'Press de banca', listo: true })] });
    expect(lista[0]).toBe('¿Por qué me toca subir en Press de banca?');
  });

  it('estancado 2 semanas o más: «Estoy estancado en <ejercicio>, ¿qué hago?»', () => {
    const marcas = [
      { fecha: '2026-10-20', valor: 60 },
      { fecha: '2026-11-02', valor: 62 },
      { fecha: '2026-11-09', valor: 61 },
      { fecha: '2026-11-16', valor: 62 },
    ];
    const lista = textos({ hoy: HOY, estadoHoy: 'descanso', ejercicios: [ejercicio({ nombre: 'Sentadilla', marcas })] });
    expect(lista[0]).toBe('Estoy estancado en Sentadilla, ¿qué hago?');
  });

  it('por defecto: «Arma una rutina para mis días de entrenamiento», y siempre 3 sin repetir', () => {
    const lista = textos({ hoy: HOY, estadoHoy: 'descanso', ejercicios: [ejercicio({ nombre: 'Press' })] });
    expect(lista[0]).toBe('Arma una rutina para mis días de entrenamiento');
    expect(lista).toHaveLength(3);
    expect(new Set(lista).size).toBe(3);
  });

  it('todas las reglas a la vez: hoy, subir y estancado, en ese orden', () => {
    const marcas = [
      { fecha: '2026-10-01', valor: 50 },
      { fecha: '2026-10-20', valor: 49 },
      { fecha: '2026-11-10', valor: 50 },
    ];
    const lista = textos({
      hoy: HOY,
      estadoHoy: 'entrenar',
      ejercicios: [ejercicio({ nombre: 'Press', listo: true }), ejercicio({ nombre: 'Dominadas', marcas })],
    });
    expect(lista).toEqual(['¿Qué entreno hoy?', '¿Por qué me toca subir en Press?', 'Estoy estancado en Dominadas, ¿qué hago?']);
  });
});

describe('estaEstancado', () => {
  it('no, si mejoró hace menos de 2 semanas o si hubo menos de 2 sesiones después de la mejor', () => {
    expect(estaEstancado([{ fecha: '2026-11-01', valor: 1 }, { fecha: '2026-11-20', valor: 2 }, { fecha: '2026-11-22', valor: 2 }], HOY)).toBe(false);
    expect(estaEstancado([{ fecha: '2026-10-01', valor: 1 }, { fecha: '2026-10-05', valor: 3 }, { fecha: '2026-11-20', valor: 2 }], HOY)).toBe(false);
    expect(estaEstancado([{ fecha: '2026-10-01', valor: 3 }], HOY)).toBe(false);
  });
});

describe('PREGUNTAS_POR_TEMA', () => {
  it('los cinco temas, con 3 o 4 preguntas cada uno', () => {
    expect(PREGUNTAS_POR_TEMA.map((t) => t.tema)).toEqual(['Hoy', 'Mi progreso', 'Rutinas', 'Ejercicios', 'Técnica']);
    for (const tema of PREGUNTAS_POR_TEMA) expect(tema.preguntas.length).toBeGreaterThanOrEqual(3);
    for (const tema of PREGUNTAS_POR_TEMA) expect(tema.preguntas.length).toBeLessThanOrEqual(4);
  });
});
