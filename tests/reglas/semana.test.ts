// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { MarcaSesion, SesionInicio } from '@/lib/reglas/inicio';
import { mostrarTarjetaSemana, resumenSemanaAnterior } from '@/lib/reglas/semana';

// Lunes 23 de noviembre de 2026: la semana anterior va del 16 al 22.
const HOY = '2026-11-23';

const sesion = (ejercicioId: string, fecha: string, series: [number, number | null][]): SesionInicio => ({
  ejercicioId,
  nombre: { e1: 'Press de banca', e2: 'Dominadas', e3: 'Sentadilla' }[ejercicioId] ?? ejercicioId,
  tipo: ejercicioId === 'e2' ? 'calistenia' : 'peso',
  fecha,
  series: series.map(([reps, kg]) => ({ reps, pesoGramos: kg === null ? null : kg * 1000 })),
});

// Las marcas que la base calcularía para esas sesiones (mayor peso, reps con ese peso y máximo de reps).
const marcasDe = (sesiones: SesionInicio[]): MarcaSesion[] =>
  sesiones.map((completa) => {
    // Como la base: sin las series de calentamiento.
    const s = { ...completa, series: completa.series.filter((x) => x.tipoSerie !== 'aproximacion') };
    const peso = Math.max(...s.series.map((x) => x.pesoGramos ?? 0));
    return {
      ejercicioId: s.ejercicioId,
      nombre: s.nombre,
      tipo: s.tipo,
      fecha: s.fecha,
      pesoMaxGramos: s.tipo === 'peso' ? peso : null,
      repsEnPesoMax: s.tipo === 'peso' ? Math.max(...s.series.filter((x) => (x.pesoGramos ?? 0) === peso).map((x) => x.reps)) : null,
      repsMax: Math.max(...s.series.map((x) => x.reps)),
    };
  });

const resumen = (sesiones: SesionInicio[], extra: { listos?: { id: string; nombre: string }[]; activos?: string[] } = {}) =>
  resumenSemanaAnterior({ hoy: HOY, sesiones, marcas: marcasDe(sesiones), listos: extra.listos ?? [], activos: extra.activos ?? ['e1', 'e2', 'e3'] });

describe('resumen de la semana anterior', () => {
  it('sin sesiones antes de esta semana no hay tarjeta', () => {
    expect(resumen([])).toBeNull();
    expect(resumen([sesion('e1', '2026-11-23', [[10, 60]])])).toBeNull();
  });

  it('cuenta sesiones y días de la semana anterior (no los de esta)', () => {
    const r = resumen([
      sesion('e1', '2026-11-10', [[10, 60]]),
      sesion('e1', '2026-11-16', [[10, 60]]),
      sesion('e2', '2026-11-16', [[8, null]]),
      sesion('e1', '2026-11-19', [[11, 60]]),
      sesion('e1', '2026-11-23', [[12, 60]]),
    ]);
    expect(r).toMatchObject({ desde: '2026-11-16', hasta: '2026-11-22', sesiones: 3, dias: 2 });
  });

  it('récord: la mejor marca de toda la historia se logró la semana pasada', () => {
    const r = resumen([sesion('e1', '2026-11-05', [[10, 60]]), sesion('e1', '2026-11-18', [[8, 62.5], [8, 62.5]])]);
    expect(r?.mejoras).toEqual([{ ejercicioId: 'e1', nombre: 'Press de banca', texto: 'Récord: 62,5 kg × 8', record: true }]);
  });

  it('más repeticiones con el mismo peso, y con tu cuerpo', () => {
    const r = resumen([
      sesion('e1', '2026-11-05', [[9, 60]]),
      sesion('e1', '2026-11-17', [[11, 60]]),
      sesion('e2', '2026-11-04', [[7, null]]),
      sesion('e2', '2026-11-20', [[9, null]]),
    ]);
    // Las dos son récords (ninguna marca anterior las supera).
    expect(r?.mejoras.map((m) => m.texto)).toEqual(['Récord: 9 repeticiones', 'Récord: 60 kg × 11']);
  });

  it('una mejora que no es récord (hubo una marca mejor antes) se describe como subida o repeticiones', () => {
    const sesiones = [
      sesion('e1', '2026-10-01', [[12, 70]]),
      sesion('e1', '2026-11-09', [[8, 60]]),
      sesion('e1', '2026-11-18', [[10, 60]]),
    ];
    expect(resumen(sesiones)?.mejoras).toEqual([{ ejercicioId: 'e1', nombre: 'Press de banca', texto: '+2 repeticiones con 60 kg', record: false }]);
  });

  it('estancado: 2 o más sesiones seguidas con la misma marca, la última la semana pasada; sugiere qué hacer', () => {
    const r = resumen([
      sesion('e3', '2026-11-06', [[10, 80]]),
      sesion('e3', '2026-11-12', [[10, 80]]),
      sesion('e3', '2026-11-19', [[10, 80]]),
      sesion('e1', '2026-11-10', [[9, 60]]),
      sesion('e1', '2026-11-18', [[9, 60]]),
    ]);
    expect(r?.estancados).toEqual([
      { ejercicioId: 'e3', nombre: 'Sentadilla', sesiones: 3 },
      { ejercicioId: 'e1', nombre: 'Press de banca', sesiones: 2 },
    ]);
    expect(r?.sugerencia).toMatch(/^En Sentadilla, que lleva 3 sesiones igual, intenta sumar 1 repetición/);
  });

  it('si el estancado ya está en una semana más suave, la sugerencia no la contradice', () => {
    const r = resumenSemanaAnterior({
      hoy: HOY,
      sesiones: [sesion('e3', '2026-11-12', [[7, 80]]), sesion('e3', '2026-11-19', [[7, 80]])],
      marcas: [],
      listos: [],
      activos: ['e3'],
      enDescarga: ['e3'],
    });
    expect(r?.sugerencia).toMatch(/^En Sentadilla, que lleva 2 sesiones igual, toca una semana más suave/);
  });

  it('un archivado no cuenta como estancado', () => {
    expect(resumen([sesion('e3', '2026-11-12', [[10, 80]]), sesion('e3', '2026-11-19', [[10, 80]])], { activos: ['e1'] })?.estancados).toEqual([]);
  });

  it('sugerencias sin estancados: subir, volver a entrenar o seguir así', () => {
    const listo = resumen([sesion('e1', '2026-11-10', [[9, 60]]), sesion('e1', '2026-11-18', [[12, 60]])], {
      listos: [{ id: 'e1', nombre: 'Press de banca' }],
    });
    expect(listo?.sugerencia).toBe('Esta semana te toca subir en Press de banca: mira su recomendación antes de entrenar.');
    expect(resumen([sesion('e1', '2026-11-05', [[9, 60]])])?.sugerencia).toMatch(/^La semana pasada no anotaste sesiones/);
    expect(resumen([sesion('e1', '2026-11-05', [[9, 60]]), sesion('e1', '2026-11-18', [[10, 60]])])?.sugerencia).toMatch(/^Sigue así/);
  });

  it('las series de calentamiento no cuentan para la marca', () => {
    const conCalentamiento: SesionInicio = {
      ...sesion('e1', '2026-11-18', [[10, 60]]),
      series: [
        { reps: 15, pesoGramos: 100000, tipoSerie: 'aproximacion' },
        { reps: 10, pesoGramos: 60000 },
      ],
    };
    const r = resumen([sesion('e1', '2026-11-10', [[10, 60]]), conCalentamiento]);
    expect(r?.mejoras).toEqual([]);
  });
});

describe('cuándo se muestra', () => {
  it('desde el lunes y toda la semana, hasta que se cierra; vuelve el lunes siguiente', () => {
    expect(mostrarTarjetaSemana('2026-11-23', null)).toBe(true);
    expect(mostrarTarjetaSemana('2026-11-26', null)).toBe(true);
    expect(mostrarTarjetaSemana('2026-11-26', '2026-11-23')).toBe(false);
    expect(mostrarTarjetaSemana('2026-11-30', '2026-11-23')).toBe(true);
  });
});
