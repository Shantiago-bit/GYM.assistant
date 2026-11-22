// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  FILTROS_EJERCICIOS,
  pasaFiltro,
  vistaEjercicios,
  desdeParaInicio,
  estadosSemana,
  fechaCorta,
  fraseCorta,
  haceDias,
  inicioDeSemana,
  preguntaInicial,
  progresoSemana,
  recomendacionDelListado,
  resumenDeHoy,
  tarjetaSemana,
  tendenciaEjercicio,
  textoAnillo,
  textoTendencia,
  ultimoRecord,
  type MarcaSesion,
  type SesionInicio,
} from '@/lib/reglas/inicio';

// 2026-11-19 es jueves; su semana va del lunes 16 al domingo 22.
const HOY = '2026-11-19';
const LUNES_A_VIERNES = [{ dias: [1, 2, 3, 4, 5], vigenteDesde: '2026-01-01' }];

const sesion = (fecha: string, ejercicioId = 'e1', series: SesionInicio['series'] = [{ reps: 10, pesoGramos: 40000 }]): SesionInicio => ({
  ejercicioId,
  nombre: ejercicioId === 'e1' ? 'Press de banca' : 'Dominadas',
  tipo: ejercicioId === 'e1' ? 'peso' : 'calistenia',
  fecha,
  series,
});

describe('semana', () => {
  it('el lunes de la semana y la fecha de inicio del gráfico de 4 semanas', () => {
    expect(inicioDeSemana(HOY)).toBe('2026-11-16');
    expect(inicioDeSemana('2026-11-16')).toBe('2026-11-16');
    expect(inicioDeSemana('2026-11-22')).toBe('2026-11-16'); // domingo
    expect(desdeParaInicio(HOY)).toBe('2026-10-26');
  });

  it('cada día tiene su estado: entrenado, planificado pendiente o descanso, y se marca hoy', () => {
    const dias = estadosSemana({
      hoy: HOY,
      historialDias: LUNES_A_VIERNES,
      sesiones: [sesion('2026-11-16'), sesion('2026-11-16', 'e2'), sesion('2026-11-16'), sesion('2026-11-22', 'e2'), sesion('2026-11-15')],
    });
    expect(dias.map((dia) => dia.letra).join('')).toBe('LMXJVSD');
    expect(dias.map((dia) => dia.estado)).toEqual([
      'entrenado',
      'planificado',
      'planificado',
      'planificado',
      'planificado',
      'descanso',
      'entrenado', // un domingo con sesión (día extra)
    ]);
    // Sin repetir el mismo ejercicio en el día.
    expect(dias[0]!.ejercicios).toEqual([
      { id: 'e1', nombre: 'Press de banca' },
      { id: 'e2', nombre: 'Dominadas' },
    ]);
    expect(dias.filter((dia) => dia.esHoy).map((dia) => dia.fecha)).toEqual([HOY]);
    expect(dias[4]!.esFuturo).toBe(true);
    expect(dias[6]!.planificado).toBe(false);
  });

  it('el anillo cuenta solo los días planificados entrenados; los extra no suman', () => {
    const dias = estadosSemana({
      hoy: HOY,
      historialDias: LUNES_A_VIERNES,
      sesiones: [sesion('2026-11-16'), sesion('2026-11-17'), sesion('2026-11-22')],
    });
    expect(progresoSemana(dias)).toEqual({ entrenados: 2, planificados: 5, fraccion: 0.4 });
    expect(textoAnillo(5, { entrenados: 3, planificados: 4 })).toBe(
      'Racha de 5 días; esta semana entrenaste 3 de 4 días planificados',
    );
    expect(textoAnillo(1, { entrenados: 1, planificados: 4 })).toMatch(/^Racha de 1 día;/);
  });

  it('sin historial de días usa lunes a sábado', () => {
    const dias = estadosSemana({ hoy: HOY, historialDias: [], sesiones: [] });
    expect(dias.map((dia) => dia.planificado)).toEqual([true, true, true, true, true, true, false]);
  });
});

describe('resumen de hoy y tarjeta "Esta semana"', () => {
  it('cuenta ejercicios, series y volumen de hoy sin las series de aproximación', () => {
    const resumen = resumenDeHoy(
      [
        sesion(HOY, 'e1', [
          { reps: 10, pesoGramos: 40000 },
          { reps: 10, pesoGramos: 40000 },
          { reps: 5, pesoGramos: 20000, tipoSerie: 'aproximacion' },
        ]),
        sesion(HOY, 'e2', [{ reps: 8, pesoGramos: null }]),
        sesion('2026-11-18'),
      ],
      HOY,
    );
    expect(resumen).toEqual({ ejercicios: 2, series: 4, volumenKg: 800 });
  });

  it('sesiones y volumen de la semana, con 4 semanas para el gráfico (la más antigua primero)', () => {
    const { actual, semanas } = tarjetaSemana(
      [sesion('2026-10-27'), sesion('2026-11-10'), sesion('2026-11-16'), sesion('2026-11-18', 'e1', [{ reps: 5, pesoGramos: 100000, extras: [{ reps: 2, pesoGramos: 80000 }] }])],
      HOY,
    );
    expect(semanas.map((semana) => semana.inicio)).toEqual(['2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16']);
    expect(semanas.map((semana) => semana.sesiones)).toEqual([1, 0, 1, 2]);
    expect(actual).toEqual({ inicio: '2026-11-16', sesiones: 2, volumenKg: 400 + 500 + 160 });
  });
});

describe('último récord', () => {
  const marca = (m: Partial<MarcaSesion> & Pick<MarcaSesion, 'fecha'>): MarcaSesion => ({
    ejercicioId: 'e1',
    nombre: 'Press de banca',
    tipo: 'peso',
    pesoMaxGramos: 40000,
    repsEnPesoMax: 10,
    repsMax: 10,
    ...m,
  });

  it('sin marcas no hay récord', () => {
    expect(ultimoRecord([], HOY)).toBeNull();
  });

  it('el récord vigente es la primera vez que se logró; un empate no lo mueve', () => {
    const record = ultimoRecord(
      [marca({ fecha: '2026-10-01', pesoMaxGramos: 50000, repsEnPesoMax: 8 }), marca({ fecha: '2026-11-18', pesoMaxGramos: 50000, repsEnPesoMax: 8 })],
      HOY,
    );
    expect(record).toMatchObject({ fecha: '2026-10-01', valor: 50000, reps: 8, nuevo: false, diasDesde: 49 });
  });

  it('el mismo peso con más repeticiones es récord; el más reciente de todos los ejercicios gana', () => {
    const record = ultimoRecord(
      [
        marca({ fecha: '2026-10-01', pesoMaxGramos: 50000, repsEnPesoMax: 8 }),
        marca({ fecha: '2026-11-14', pesoMaxGramos: 50000, repsEnPesoMax: 9 }),
        marca({ ejercicioId: 'e2', nombre: 'Dominadas', tipo: 'calistenia', fecha: '2026-11-01', pesoMaxGramos: null, repsMax: 12 }),
        marca({ ejercicioId: 'e2', nombre: 'Dominadas', tipo: 'calistenia', fecha: '2026-11-17', pesoMaxGramos: null, repsMax: 11 }),
      ],
      HOY,
    );
    expect(record).toMatchObject({ ejercicioId: 'e1', fecha: '2026-11-14', reps: 9, nuevo: true, diasDesde: 5 });
  });

  it('con tu cuerpo, el máximo de repeticiones; "Nuevo" solo los últimos 7 días', () => {
    const record = ultimoRecord(
      [
        marca({ ejercicioId: 'e2', nombre: 'Dominadas', tipo: 'calistenia', fecha: '2026-11-01', pesoMaxGramos: null, repsMax: 8 }),
        marca({ ejercicioId: 'e2', nombre: 'Dominadas', tipo: 'calistenia', fecha: '2026-11-12', pesoMaxGramos: null, repsMax: 12 }),
      ],
      HOY,
    );
    expect(record).toMatchObject({ tipo: 'calistenia', valor: 12, reps: null, nuevo: false, diasDesde: 7 });
    expect(haceDias(0)).toBe('hoy');
    expect(haceDias(1)).toBe('ayer');
    expect(haceDias(7)).toBe('hace 7 días');
  });
});

describe('tarjetas de ejercicio', () => {
  it('la tendencia toma las últimas 6 sesiones: 1RM estimado con peso, máximo de repeticiones con tu cuerpo', () => {
    const sesiones = Array.from({ length: 8 }, (_, i) => sesion(`2026-11-0${i + 1}`, 'e1', [{ reps: 10, pesoGramos: 30000 + i * 1000 }]));
    const valores = tendenciaEjercicio(sesiones, 'peso');
    expect(valores).toHaveLength(6);
    expect(valores[0]).toBe(Math.round(32000 * (1 + 10 / 30)));
    expect(tendenciaEjercicio([sesion('2026-11-01', 'e2', [{ reps: 6, pesoGramos: null }, { reps: 9, pesoGramos: null }])], 'calistenia')).toEqual([9]);
    expect(textoTendencia([42667, 48000], 'peso', false)).toBe(
      'Tendencia de las últimas 2 sesiones: el peso máximo estimado sube, de 42,7 kg a 48 kg',
    );
    expect(textoTendencia([9], 'calistenia', false)).toMatch(/Aún no hay suficientes/);
  });

  it('la frase corta sale de la misma recomendación que el detalle, con su color', () => {
    const ejercicio = { tipo: 'peso' as const, metodo: 'rectas' as const, rango: [8, 12] as [number, number], pesoRefGramos: 40000, metaReps: 12 };
    expect(recomendacionDelListado(ejercicio, [])).toBeNull();
    expect(fraseCorta(null, false)).toEqual({ texto: 'Falta la primera medición', tono: 'mantener' });

    const tope = sesion(HOY, 'e1', [{ reps: 12, pesoGramos: 40000 }, { reps: 12, pesoGramos: 40000 }, { reps: 5, pesoGramos: 20000, tipoSerie: 'aproximacion' }]);
    const subir = recomendacionDelListado(ejercicio, [tope]);
    expect(subir?.accion).toBe('subir_peso');
    expect(fraseCorta(subir, false)).toEqual({ texto: 'Sube a 42,5 kg', tono: 'subir' });

    const bajo = (fecha: string) => sesion(fecha, 'e1', [{ reps: 5, pesoGramos: 40000 }]);
    const descarga = recomendacionDelListado(ejercicio, [bajo('2026-11-10'), bajo(HOY)]);
    expect(fraseCorta(descarga, false).tono).toBe('descarga');

    const medio = recomendacionDelListado(ejercicio, [sesion(HOY, 'e1', [{ reps: 10, pesoGramos: 40000 }])]);
    expect(fraseCorta(medio, false)).toEqual({ texto: 'Suma repeticiones', tono: 'mantener' });
  });
});

describe('filtros de "Mis ejercicios"', () => {
  it('lee la vista desde la consulta; lo desconocido es "todos"', () => {
    expect(vistaEjercicios('')).toEqual({ archivados: false, filtro: 'todos' });
    expect(vistaEjercicios('tipo=peso')).toEqual({ archivados: false, filtro: 'peso' });
    expect(vistaEjercicios('?tipo=calistenia')).toEqual({ archivados: false, filtro: 'calistenia' });
    expect(vistaEjercicios('listos=1&tipo=peso')).toEqual({ archivados: false, filtro: 'listos' });
    expect(vistaEjercicios('tipo=otro&listos=0')).toEqual({ archivados: false, filtro: 'todos' });
    expect(vistaEjercicios('archivados=1&aviso=restaurado')).toEqual({ archivados: true, filtro: 'todos' });
  });

  it('cada filtro deja pasar lo suyo y cada chip apunta a su consulta', () => {
    const peso = { tipo: 'peso' as const, listo: false };
    const cuerpoListo = { tipo: 'calistenia' as const, listo: true };
    expect([peso, cuerpoListo].filter((e) => pasaFiltro(e, 'todos'))).toHaveLength(2);
    expect([peso, cuerpoListo].filter((e) => pasaFiltro(e, 'peso'))).toEqual([peso]);
    expect([peso, cuerpoListo].filter((e) => pasaFiltro(e, 'calistenia'))).toEqual([cuerpoListo]);
    expect([peso, cuerpoListo].filter((e) => pasaFiltro(e, 'listos'))).toEqual([cuerpoListo]);
    for (const opcion of FILTROS_EJERCICIOS) {
      expect(vistaEjercicios(new URL(opcion.href, 'http://x').search).filtro).toBe(opcion.valor);
    }
  });
});

describe('saludo y CHRONO', () => {
  it('fecha corta en español con mayúscula inicial', () => {
    expect(fechaCorta(HOY)).toMatch(/^Jueves, 19 de noviembre$/);
  });

  it('la pregunta para CHRONO se recorta y no puede ser una lista', () => {
    expect(preguntaInicial(undefined)).toBe('');
    expect(preguntaInicial(['  ¿Qué entreno hoy?  ', 'otra'])).toBe('¿Qué entreno hoy?');
    expect(preguntaInicial('a'.repeat(500))).toHaveLength(300);
  });
});
