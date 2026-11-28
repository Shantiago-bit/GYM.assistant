// @vitest-environment node
// Analítica del panel: embudo y cohortes con COUNT en SQL; la creación de las cuentas se pasa a Bogotá antes de agrupar.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const consultar = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/db/conexion', () => ({ consultar: (...args: unknown[]) => consultar(...args), conTransaccion: vi.fn() }));

import { calcularEstadisticasAnalitica } from '@/lib/datos/admin';

// Con llaves: si beforeEach devuelve una función, Vitest la ejecuta al terminar cada prueba.
beforeEach(() => {
  consultar.mockReset();
});

const HOY = '2026-11-28';
const llamadas = () => consultar.mock.calls as [string, unknown[]][];
const sqlEmbudo = () => llamadas().find(([sql]) => sql.includes('"dosSemanas"'))!;
const sqlCohortes = () => llamadas().find(([sql]) => sql.includes('tamanos AS'))!;

function responder(datos: { embudo?: unknown[]; cohortes?: unknown[] }) {
  consultar.mockImplementation(async (sql: string) => {
    if (sql.includes('"dosSemanas"')) return datos.embudo ?? [];
    if (sql.includes('tamanos AS')) return datos.cohortes ?? [];
    throw new Error(`Consulta inesperada: ${sql}`);
  });
}

describe('calcularEstadisticasAnalitica', () => {
  it('dos consultas, desde el lunes de la primera cohorte y con el número de semanas como parámetro', async () => {
    responder({});
    const estadisticas = await calcularEstadisticasAnalitica(HOY, 8);
    expect(consultar).toHaveBeenCalledTimes(2);
    expect(estadisticas.desde).toBe('2026-10-05');
    expect(sqlEmbudo()[1]).toEqual(['2026-10-05']);
    expect(sqlCohortes()[1]).toEqual(['2026-10-05', 8]);

    await calcularEstadisticasAnalitica(HOY, 12);
    expect(llamadas().at(-1)![1]).toEqual(expect.arrayContaining(['2026-09-07']));
  });

  it('created_at se pasa a Bogotá antes de agrupar; el filtro usa un límite calculado una vez', async () => {
    responder({});
    await calcularEstadisticasAnalitica(HOY, 8);
    for (const [sql] of llamadas()) {
      expect(sql).toContain("date_trunc('week', (u.created_at AT TIME ZONE 'America/Bogota')::date)::date AS cohorte");
      expect(sql).toContain("WHERE u.created_at >= ($1::date::timestamp AT TIME ZONE 'America/Bogota')");
    }
  });

  it('solo COUNT: el embudo devuelve una fila de cifras y las cohortes, cifras por cohorte y semana; nunca correos ni nombres', async () => {
    responder({});
    await calcularEstadisticasAnalitica(HOY, 8);
    // Lo único que llega a Node son las columnas del SELECT final: exactamente estas cifras (y el lunes de la cohorte).
    const columnasFinales = (sql: string) => {
      const final = sql.slice(sql.lastIndexOf('SELECT'));
      return [...final.slice(0, final.indexOf('FROM')).matchAll(/AS "?(\w+)"?/g)].map((m) => m[1]);
    };
    expect(columnasFinales(sqlEmbudo()[0])).toEqual(['registradas', 'confirmadas', 'conPerfil', 'primeraSesion', 'dosSemanas']);
    // t.registradas y a.semana salen sin alias; la línea siguiente comprueba la lista completa.
    expect(columnasFinales(sqlCohortes()[0])).toEqual(['cohorte', 'activas']);
    expect(sqlCohortes()[0]).toMatch(/SELECT t\.cohorte::text AS cohorte, t\.registradas, a\.semana, COALESCE/);
    for (const [sql] of llamadas()) expect(sql).not.toMatch(/u\.email\b|p\.nombre|p\.apodo|fecha_nacimiento/);
    const [embudo] = sqlEmbudo();
    expect(embudo).toMatch(/count\(DISTINCT date_trunc\('week', s\.fecha\)\)::int AS semanas_activas/);
    expect(embudo).toContain('count(*) FILTER (WHERE a.semanas_activas >= 2)::int AS "dosSemanas"');
    expect(embudo).toContain('count(p.usuario_id)::int AS "conPerfil"');
    const [cohortes] = sqlCohortes();
    expect(cohortes).toContain('((date_trunc(\'week\', s.fecha)::date - c.cohorte) / 7)::int AS semana');
    expect(cohortes).toContain('count(DISTINCT c.id)::int AS activas');
    expect(cohortes).toContain('s.fecha >= c.cohorte + 7 AND s.fecha < c.cohorte + 7 * ($2::int + 1)');
    // Límite constante para que el filtro por fecha pueda usar idx_sesiones_fecha.
    expect(cohortes).toContain('WHERE s.fecha >= $1::date + 7');
    expect(cohortes).toMatch(/LEFT JOIN actividad a ON a\.cohorte = t\.cohorte/);
  });

  it('arma el embudo, la conversión, la matriz de cohortes y el promedio con las reglas', async () => {
    responder({
      embudo: [{ registradas: 10, confirmadas: 8, conPerfil: 7, primeraSesion: 4, dosSemanas: 2 }],
      cohortes: [
        { cohorte: '2026-11-02', registradas: 6, semana: 1, activas: 3 },
        { cohorte: '2026-11-02', registradas: 6, semana: 2, activas: 2 },
        { cohorte: '2026-11-16', registradas: 4, semana: null, activas: 0 },
      ],
    });
    const estadisticas = await calcularEstadisticasAnalitica(HOY, 8);
    expect(estadisticas.semanas).toBe(8);
    expect(estadisticas.embudo.map((f) => f.cantidad)).toEqual([10, 8, 7, 4, 2]);
    expect(estadisticas.conversion).toEqual({ tipo: 'porcentaje', porcentaje: 40 });
    expect(estadisticas.cohortes).toHaveLength(8);
    const noviembre2 = estadisticas.cohortes.find((c) => c.cohorte === '2026-11-02')!;
    expect(noviembre2.registradas).toBe(6);
    expect(noviembre2.celdas.slice(0, 3).map((c) => (c.estado === 'futura' ? 'futura' : c.porcentaje))).toEqual([50, 33, 0]);
    expect(estadisticas.retencionPromedio).toHaveLength(8);
  });

  it('sin cuentas en el periodo: embudo en cero, "sin registros" y cohortes vacías', async () => {
    responder({});
    const estadisticas = await calcularEstadisticasAnalitica(HOY, 8);
    expect(estadisticas.embudo.every((f) => f.cantidad === 0)).toBe(true);
    expect(estadisticas.conversion).toEqual({ tipo: 'sin_registros' });
    expect(estadisticas.cohortes.every((c) => c.registradas === 0)).toBe(true);
    expect(estadisticas.retencionPromedio.every((p) => p === null)).toBe(true);
  });
});
