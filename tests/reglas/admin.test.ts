// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  aCsv,
  celdaCsv,
  completarMeses,
  cosasPorAtender,
  csvResumen,
  diasDelMes,
  esMetaValida,
  esPersonaActiva,
  META_MAXIMA,
  META_MINIMA,
  etiquetaMes,
  horaBogota,
  mesesHasta,
  promedio,
  proyectarMeta,
  saludoSegunHora,
  sentidoVariacion,
  textoVariacion,
  variacion,
} from '@/lib/reglas/admin';

describe('persona activa', () => {
  it('registró al menos una sesión en el periodo', () => {
    expect(esPersonaActiva(0)).toBe(false);
    expect(esPersonaActiva(1)).toBe(true);
    expect(esPersonaActiva(12)).toBe(true);
  });
});

describe('variación frente al periodo anterior', () => {
  it('(actual − anterior) / anterior, redondeada', () => {
    expect(variacion(118, 100)).toEqual({ tipo: 'cambio', porcentaje: 18 });
    expect(variacion(88, 100)).toEqual({ tipo: 'cambio', porcentaje: -12 });
    expect(variacion(10, 10)).toEqual({ tipo: 'cambio', porcentaje: 0 });
  });

  it('con el anterior en 0 dice "nuevo" en lugar de un porcentaje infinito', () => {
    expect(variacion(7, 0)).toEqual({ tipo: 'nuevo' });
    expect(textoVariacion(variacion(7, 0))).toBe('nuevo');
    expect(variacion(0, 0)).toEqual({ tipo: 'igual' });
    expect(textoVariacion(variacion(0, 0))).toBe('sin cambio');
  });

  it('texto y sentido de la insignia', () => {
    expect(textoVariacion(variacion(118, 100))).toBe('+18 %');
    expect(textoVariacion(variacion(88, 100))).toBe('−12 %');
    expect(sentidoVariacion(variacion(118, 100))).toBe('sube');
    expect(sentidoVariacion(variacion(88, 100))).toBe('baja');
    expect(sentidoVariacion(variacion(5, 0))).toBe('sube');
    expect(sentidoVariacion(variacion(10, 10))).toBe('igual');
  });
});

describe('meta del mes', () => {
  it('proyección lineal, "en camino" y cuántas faltan por día', () => {
    // Día 10 de 30 con 20 activas: 60 a fin de mes, meta 50 → en camino.
    expect(proyectarMeta({ activas: 20, meta: 50, dia: 10, diasDelMes: 30 })).toEqual({
      meta: 50,
      activas: 20,
      proyeccion: 60,
      enCamino: true,
      faltan: 30,
      faltanPorDia: 2,
      porcentaje: 40,
    });
    // Día 20 de 30 con 20 activas: 30 a fin de mes → por debajo; faltan 30 en 10 días = 3 por día.
    const abajo = proyectarMeta({ activas: 20, meta: 50, dia: 20, diasDelMes: 30 });
    expect(abajo).toMatchObject({ proyeccion: 30, enCamino: false, faltanPorDia: 3 });
  });

  it('meta cumplida, último día del mes y primer día', () => {
    expect(proyectarMeta({ activas: 55, meta: 50, dia: 12, diasDelMes: 30 })).toMatchObject({ enCamino: true, faltan: 0, faltanPorDia: 0, porcentaje: 100 });
    expect(proyectarMeta({ activas: 40, meta: 50, dia: 31, diasDelMes: 31 })).toMatchObject({ faltan: 10, faltanPorDia: 10, proyeccion: 40 });
    expect(proyectarMeta({ activas: 3, meta: 50, dia: 1, diasDelMes: 30 })).toMatchObject({ proyeccion: 90, enCamino: true });
  });
});

describe('fechas del panel', () => {
  it('saludo según la hora de Bogotá', () => {
    expect(horaBogota(new Date('2026-11-21T12:00:00Z'))).toBe(7); // UTC−5
    expect(saludoSegunHora(7)).toBe('Buenos días');
    expect(saludoSegunHora(12)).toBe('Buenas tardes');
    expect(saludoSegunHora(18)).toBe('Buenas tardes');
    expect(saludoSegunHora(19)).toBe('Buenas noches');
    expect(saludoSegunHora(2)).toBe('Buenas noches');
    expect(saludoSegunHora(horaBogota(new Date('2026-11-22T02:30:00Z')))).toBe('Buenas noches'); // 21:30 del 21
  });

  it('meses hacia atrás, días del mes y etiquetas', () => {
    expect(mesesHasta('2026-02-14', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    expect(diasDelMes('2026-02')).toBe(28);
    expect(diasDelMes('2028-02')).toBe(29);
    expect(diasDelMes('2026-11')).toBe(30);
    expect(etiquetaMes('2026-09')).toBe('sept');
    expect(etiquetaMes('2026-11', true)).toBe('nov 2026');
  });

  it('completa con ceros los meses sin datos', () => {
    const filas = completarMeses([{ mes: '2026-10', registros: 3, activas: 2, sesiones: 9, series: 30, mensajes: 4 }], '2026-11-21', 3);
    expect(filas.map((fila) => [fila.mes, fila.sesiones])).toEqual([
      ['2026-09', 0],
      ['2026-10', 9],
      ['2026-11', 0],
    ]);
    expect(promedio([2, 4, 9])).toBe(5);
    expect(promedio([])).toBe(0);
  });
});

describe('lo que necesita atención', () => {
  it('suma y describe solo lo que hay', () => {
    expect(cosasPorAtender({ correosConError24h: 2, tutoresPorVencer48h: 1, sinConfirmarMas48h: 0 })).toEqual({
      total: 3,
      detalles: ['2 correos con error en las últimas 24 h', '1 autorización de tutor vence en menos de 48 h'],
    });
    expect(cosasPorAtender({ correosConError24h: 0, tutoresPorVencer48h: 0, sinConfirmarMas48h: 0 }).total).toBe(0);
  });
});

describe('CSV', () => {
  it('escapa comillas, comas y evita fórmulas', () => {
    expect(celdaCsv('hola, "mundo"')).toBe('"hola, ""mundo"""');
    expect(celdaCsv('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(celdaCsv(-3)).toBe('-3');
    expect(aCsv(['a', 'b'], [[1, 'x']])).toBe('a,b\r\n1,x\r\n');
  });

  it('el CSV del resumen solo tiene cifras por mes: ni correos, ni nombres, ni ids', () => {
    const csv = csvResumen([{ mes: '2026-11', registros: 4, activas: 3, sesiones: 10, series: 31, mensajes: 7 }]);
    expect(csv).toBe('mes,registros,personas_activas,sesiones,series,mensajes_chrono\r\n2026-11,4,3,10,31,7\r\n');
    expect(csv).not.toMatch(/@|[0-9a-f]{8}-[0-9a-f]{4}-/i);
  });
});

describe('validación de la meta mensual', () => {
  it('acepta enteros de 1 a 1.000.000, incluidos los extremos', () => {
    expect(META_MINIMA).toBe(1);
    expect(META_MAXIMA).toBe(1_000_000);
    for (const valor of [1, 50, 999_999, 1_000_000]) expect(esMetaValida(valor)).toBe(true);
  });

  it('rechaza 0, negativos, decimales, valores por encima del máximo y lo que no es número', () => {
    for (const valor of [0, -5, 2.5, 1_000_001, Number.NaN, Number.POSITIVE_INFINITY, '50', null, undefined, {}]) {
      expect(esMetaValida(valor)).toBe(false);
    }
  });
});
