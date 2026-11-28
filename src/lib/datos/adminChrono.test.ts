// @vitest-environment node
// CHRONO del panel: solo SUM y COUNT de chat_uso (cuántos mensajes por cuenta y día); nunca el contenido.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const consultar = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/db/conexion', () => ({ consultar: (...args: unknown[]) => consultar(...args), conTransaccion: vi.fn() }));

import { calcularEstadisticasChrono } from '@/lib/datos/admin';

// Con llaves: si beforeEach devuelve una función, Vitest la ejecuta al terminar cada prueba.
beforeEach(() => {
  consultar.mockReset();
});

const HOY = '2026-11-28';
const llamadas = () => consultar.mock.calls as [string, unknown[]][];
const porSql = (texto: string) => llamadas().find(([sql]) => sql.includes(texto))!;

function responder(datos: { dias?: unknown[]; meses?: unknown[]; totales?: unknown[] }) {
  consultar.mockImplementation(async (sql: string) => {
    if (sql.includes('fecha::text AS dia')) return datos.dias ?? [];
    if (sql.includes('FULL JOIN activas')) return datos.meses ?? [];
    if (sql.includes('"usaronAlgunaVez"')) return datos.totales ?? [];
    throw new Error(`Consulta inesperada: ${sql}`);
  });
}

describe('calcularEstadisticasChrono', () => {
  it('tres consultas: 30 días y totales con el límite como parámetro; 12 meses desde el día 1 del mes más antiguo', async () => {
    responder({});
    await calcularEstadisticasChrono(HOY, 40);
    expect(consultar).toHaveBeenCalledTimes(3);
    const [sqlDias, valoresDias] = porSql('fecha::text AS dia');
    expect(sqlDias).toContain('WHERE fecha >= $1::date - 29');
    expect(valoresDias).toEqual([HOY, 40]);
    expect(porSql('FULL JOIN activas')[1]).toEqual(['2025-12-01']);
    const [sqlTotales, valoresTotales] = porSql('"usaronAlgunaVez"');
    expect(sqlTotales).toContain('WHERE fecha >= $1::date - 29');
    expect(valoresTotales).toEqual([HOY, 40]);
  });

  it('el límite se cuenta como mensajes ≥ límite y nunca con límite 0', async () => {
    responder({});
    await calcularEstadisticasChrono(HOY, 40);
    expect(porSql('fecha::text AS dia')[0]).toContain('count(*) FILTER (WHERE $2::int > 0 AND mensajes >= $2::int)::int AS "enLimite"');
    expect(porSql('"usaronAlgunaVez"')[0]).toContain(
      'count(DISTINCT usuario_id) FILTER (WHERE $2::int > 0 AND mensajes >= $2::int)::int AS "personasEnLimite30"',
    );
  });

  it('solo cifras: nada de contenido de conversaciones, correos ni nombres; el SELECT final solo devuelve conteos y fechas', async () => {
    responder({});
    await calcularEstadisticasChrono(HOY, 40);
    for (const [sql] of llamadas()) {
      expect(sql).not.toMatch(/contenido|texto|mensaje_texto|email|nombre|apodo|perfiles/i);
      const final = sql.slice(sql.lastIndexOf('SELECT'));
      const columnas = final.slice(0, final.indexOf('FROM'));
      expect(columnas).not.toMatch(/\busuario_id\s*(,|$)|\bid\b/);
    }
    // Personas activas que usaron CHRONO ese mismo mes: unión por mes y cuenta.
    expect(porSql('FULL JOIN activas')[0]).toContain('FULL JOIN activas a ON a.mes = c.mes AND a.usuario_id = c.usuario_id');
  });

  it('arma 30 días, 12 meses y el resumen con las reglas', async () => {
    responder({
      dias: [{ dia: '2026-11-27', mensajes: 45, personas: 2, enLimite: 1 }],
      meses: [{ mes: '2026-11', mensajes: 45, personas: 2, activas: 4, activasConChrono: 1 }],
      totales: [{ registradas: 10, usaronAlgunaVez: 3, personas30: 2, mensajes30: 45, personasEnLimite30: 1, diasEnLimite30: 1 }],
    });
    const estadisticas = await calcularEstadisticasChrono(HOY, 40);
    expect(estadisticas.limite).toBe(40);
    expect(estadisticas.dias).toHaveLength(30);
    expect(estadisticas.dias.at(-2)).toEqual({ dia: '2026-11-27', mensajes: 45, personas: 2, enLimite: 1 });
    expect(estadisticas.meses).toHaveLength(12);
    expect(estadisticas.meses.at(-1)).toMatchObject({ mes: '2026-11', porcentajeActivas: 25, promedio: 22.5 });
    expect(estadisticas.resumen).toMatchObject({ adopcion: 30, promedio30: 22.5, porcentajeEnLimite30: 50 });
  });

  it('sin uso: series en cero y resumen sin porcentajes', async () => {
    responder({});
    const estadisticas = await calcularEstadisticasChrono(HOY, 40);
    expect(estadisticas.dias.every((d) => d.mensajes === 0)).toBe(true);
    expect(estadisticas.resumen).toMatchObject({ adopcion: null, promedio30: 0, porcentajeEnLimite30: null });
  });
});
