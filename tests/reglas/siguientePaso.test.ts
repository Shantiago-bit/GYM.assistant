// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { RANGO_CALISTENIA, RANGO_PESO } from '@/lib/config/gym';
import { valoresSencillos } from '@/lib/reglas/modo';
import type { Recomendacion } from '@/lib/reglas/progresion';
import {
  fraseAccion,
  pasoDeHoy,
  siguientePaso,
  tituloAccion,
  type EjercicioDeHoy,
} from '@/lib/reglas/siguientePaso';
import { GLOSARIO } from '@/lib/textos/glosario';

const rec = (accion: Recomendacion['accion'], pesoSugeridoGramos: number | null, metaRepsSugerida: number): Recomendacion => ({
  accion,
  pesoSugeridoGramos,
  metaRepsSugerida,
  mensaje: '',
});
const PRESS = { id: 'e1', nombre: 'Press de banca', tipo: 'peso' as const, metodo: 'rectas' as const, rango: [8, 12] as [number, number] };
const DOMINADA = { ...PRESS, id: 'e2', nombre: 'Dominadas', tipo: 'calistenia' as const, rango: [8, 15] as [number, number] };

describe('modo sencillo: valores por defecto', () => {
  it('peso: ganar músculo, series rectas, 8 a 12 y peso de partida 0 (lo fija la primera medición)', () => {
    expect(valoresSencillos('peso')).toEqual({
      enfoque: 'hipertrofia',
      metodo: 'rectas',
      rangoMin: RANGO_PESO[0],
      rangoMax: RANGO_PESO[1],
      pesoRefKg: 0,
    });
  });

  it('calistenia: el rango de hipertrofia de calistenia y sin peso', () => {
    expect(valoresSencillos('calistenia')).toEqual({
      enfoque: 'hipertrofia',
      metodo: 'rectas',
      rangoMin: RANGO_CALISTENIA[0],
      rangoMax: RANGO_CALISTENIA[1],
      pesoRefKg: undefined,
    });
  });
});

describe('frase de acción de la recomendación', () => {
  it('peso: subir, repetir, descarga y mantener', () => {
    expect(fraseAccion(rec('subir_peso', 62500, 8), PRESS)).toBe('La próxima vez usa 62,5 kg y busca 8 repeticiones por serie.');
    expect(fraseAccion(rec('subir_reps', 60000, 12), PRESS)).toBe(
      'Repite el mismo peso (60 kg) e intenta llegar a 12 repeticiones en todas las series.',
    );
    expect(fraseAccion(rec('bajar_peso', 50000, 8), PRESS)).toBe(
      'Esta semana baja a 50 kg para recuperarte; la siguiente vuelves a subir.',
    );
    expect(fraseAccion(rec('mantener', 60000, 10), PRESS)).toBe(
      'Repite el mismo peso (60 kg) y busca al menos 8 repeticiones en todas las series.',
    );
  });

  it('con una sola serie clave dice cuál', () => {
    expect(fraseAccion(rec('subir_peso', 62500, 8), { ...PRESS, metodo: 'principal_descarga' })).toBe(
      'La próxima vez usa 62,5 kg y busca 8 repeticiones en la serie principal.',
    );
  });

  it('calistenia: versión más difícil, repetir y mantener', () => {
    expect(fraseAccion(rec('subir_variante', null, 8), DOMINADA)).toBe(
      'Pasa a una versión más difícil del ejercicio y busca 8 repeticiones por serie.',
    );
    expect(fraseAccion(rec('subir_reps', null, 15), DOMINADA)).toBe(
      'Repite la misma versión del ejercicio e intenta llegar a 15 repeticiones en todas las series.',
    );
    expect(fraseAccion(rec('mantener', null, 12), DOMINADA)).toBe(
      'Repite la misma versión del ejercicio y busca al menos 8 repeticiones en todas las series.',
    );
  });

  it('título corto de cada acción', () => {
    expect(tituloAccion(rec('subir_peso', 62500, 8))).toBe('Sube a 62,5 kg');
    expect(tituloAccion(rec('bajar_peso', 50000, 8))).toBe('Baja a 50 kg para recuperarte');
    expect(tituloAccion(rec('mantener', 50000, 8))).toBe('Repite el mismo objetivo');
  });
});

describe('siguiente paso de un ejercicio', () => {
  it('sin ejercicios: crear el primero', () => {
    expect(siguientePaso({ estado: 'sin_ejercicios' })).toEqual({
      titulo: 'Crea tu primer ejercicio',
      explicacion: 'Solo necesitas su nombre y saber si es con peso o con tu cuerpo.',
      accion: { texto: 'Crear mi primer ejercicio', href: '/gym/ejercicios/nuevo' },
    });
  });

  it('sin prueba inicial: la primera medición (y el nombre técnico en el modo avanzado)', () => {
    const sencillo = siguientePaso({ estado: 'sin_prueba', ejercicio: PRESS });
    expect(sencillo.titulo).toBe('Primero, haz tu primera medición');
    expect(sencillo.explicacion).toBe('Anota cuántas repeticiones logras hoy. Así sabremos desde dónde empezar.');
    expect(sencillo.accion).toEqual({ texto: 'Hacer la primera medición', href: '/gym/ejercicios/e1/prueba' });
    expect(siguientePaso({ estado: 'sin_prueba', ejercicio: PRESS }, true).accion.texto).toBe('Registrar prueba inicial');
  });

  it('con la prueba y sin sesiones: el punto de partida y anotar la sesión', () => {
    const paso = siguientePaso({ estado: 'sin_sesiones', ejercicio: PRESS, recomendacion: rec('subir_reps', 60000, 12) });
    expect(paso.titulo).toBe('Ya tienes tu punto de partida');
    expect(paso.explicacion).toBe(
      'Repite el mismo peso (60 kg) e intenta llegar a 12 repeticiones en todas las series. Cuando lo hagas, anótalo aquí.',
    );
    expect(paso.accion).toEqual({ texto: 'Anotar solo este ejercicio', href: '/gym/ejercicios/e1/sesion' });
  });

  it('con recomendación: la acción concreta', () => {
    const paso = siguientePaso({ estado: 'con_recomendacion', ejercicio: PRESS, recomendacion: rec('subir_peso', 62500, 8) });
    expect(paso.titulo).toBe('Sube a 62,5 kg');
    expect(paso.explicacion).toBe('La próxima vez usa 62,5 kg y busca 8 repeticiones por serie.');
    expect(paso.accion.href).toBe('/gym/ejercicios/e1/sesion');
  });
});

describe('franja "Hoy" de /gym', () => {
  const ej = (cambios: Partial<EjercicioDeHoy>): EjercicioDeHoy => ({
    id: 'e1',
    nombre: 'Press de banca',
    tipo: 'peso',
    archivado: false,
    totalSesiones: 3,
    listoParaSubir: false,
    ...cambios,
  });
  const base = { hoyEsDescanso: false, entrenoHoy: false, rachaActual: 0, proximoDia: 'jueves' };

  it('sin ejercicios activos: crear uno', () => {
    expect(pasoDeHoy({ ...base, ejercicios: [ej({ archivado: true })] }).accion.href).toBe('/gym/ejercicios/nuevo');
  });

  it('ningún ejercicio medido: la primera medición del primero', () => {
    const paso = pasoDeHoy({ ...base, ejercicios: [ej({ totalSesiones: 0 })] });
    expect(paso.titulo).toBe('Primero, haz tu primera medición de Press de banca');
    expect(paso.accion.href).toBe('/gym/ejercicios/e1/prueba');
  });

  it('día de entrenamiento: registrar el entrenamiento, con los listos para subir y la racha', () => {
    const paso = pasoDeHoy({
      ...base,
      rachaActual: 4,
      ejercicios: [ej({ listoParaSubir: true }), ej({ id: 'e2', listoParaSubir: true }), ej({ id: 'e3' })],
    });
    expect(paso.titulo).toBe('Hoy toca entrenar');
    expect(paso.explicacion).toBe(
      'Tienes 2 ejercicios listos para subir de peso. Anota todos los ejercicios que hagas hoy en un solo lugar. Llevas una racha de 4 días.',
    );
    expect(paso.accion).toEqual({ texto: 'Registrar mi entrenamiento', href: '/gym/entrenamiento' });
  });

  it('un listo de calistenia sube de nivel', () => {
    const paso = pasoDeHoy({ ...base, ejercicios: [ej({ tipo: 'calistenia', listoParaSubir: true })] });
    expect(paso.explicacion).toContain('Tienes 1 ejercicio listo para subir de nivel.');
  });

  it('día de descanso: la racha sigue y el próximo entrenamiento', () => {
    const paso = pasoDeHoy({ ...base, hoyEsDescanso: true, ejercicios: [ej({})] });
    expect(paso.titulo).toBe('Hoy descansas: tu racha sigue');
    expect(paso.explicacion).toBe('Descansar también es parte del progreso. Tu próximo entrenamiento es el jueves.');
    expect(paso.accion.href).toBe('/gym/resumen');
  });

  it('ya entrenó hoy: buen trabajo, y si falta medir un ejercicio, ese es el botón', () => {
    expect(pasoDeHoy({ ...base, entrenoHoy: true, ejercicios: [ej({})] }).titulo).toBe('Hoy ya entrenaste ✓');
    const paso = pasoDeHoy({ ...base, entrenoHoy: true, ejercicios: [ej({}), ej({ id: 'e9', nombre: 'Remo', totalSesiones: 0 })] });
    expect(paso.accion).toEqual({ texto: 'Medir Remo', href: '/gym/ejercicios/e9/prueba' });
  });
});

describe('glosario', () => {
  it('cada término tiene texto llano, una explicación de una frase y un ejemplo', () => {
    for (const [id, entrada] of Object.entries(GLOSARIO)) {
      expect(entrada.termino.length, id).toBeGreaterThan(0);
      expect(entrada.llano.length, id).toBeGreaterThan(0);
      expect(entrada.explicacion, id).toMatch(/^[^.]+(\.\d[^.]*)*\.$/);
      expect(entrada.ejemplo.length, id).toBeGreaterThan(0);
    }
  });

  it('los textos llanos pedidos', () => {
    expect(GLOSARIO.rir.llano).toBe('Repeticiones que te quedaron en reserva');
    expect(GLOSARIO.unorm.llano).toBe('Peso máximo estimado para 1 repetición');
    expect(GLOSARIO.hipertrofia.llano).toBe('Ganar músculo');
    expect(GLOSARIO.rango.llano).toBe('Repeticiones objetivo');
    expect(GLOSARIO.descarga.llano).toBe('Semana más suave');
    expect(GLOSARIO.aproximacion.llano).toBe('Serie de calentamiento');
    expect(GLOSARIO.calistenia.llano).toBe('Con tu peso corporal');
  });
});
