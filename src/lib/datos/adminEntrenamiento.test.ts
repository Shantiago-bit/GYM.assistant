// @vitest-environment node
// Entrenamiento del panel: cifras agregadas sobre todas las cuentas, con el umbral de anonimato en SQL.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const consultar = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/db/conexion', () => ({ consultar: (...args: unknown[]) => consultar(...args), conTransaccion: vi.fn() }));

import { calcularEstadisticasEntrenamiento } from '@/lib/datos/admin';
import { LETRAS_BASE, LETRAS_CON_MARCA } from '@/lib/reglas/entrenamientoAdmin';

// Con llaves: si beforeEach devuelve una función, Vitest la ejecuta al terminar cada prueba.
beforeEach(() => {
  consultar.mockReset();
});

const llamadas = () => consultar.mock.calls as [string, unknown[] | undefined][];
const porSql = (texto: string) => llamadas().find(([sql]) => sql.includes(texto))!;

function responder(datos: { populares?: unknown[]; tipos?: unknown[]; dias?: unknown[]; horas?: unknown[]; totales?: unknown[] }) {
  consultar.mockImplementation(async (sql: string) => {
    if (sql.includes('HAVING')) return datos.populares ?? [];
    if (sql.includes('GROUP BY tipo, archivado')) return datos.tipos ?? [];
    if (sql.includes('isodow')) return datos.dias ?? [];
    if (sql.includes('extract(hour')) return datos.horas ?? [];
    if (sql.includes('LEFT JOIN series')) return datos.totales ?? [];
    throw new Error(`Consulta inesperada: ${sql}`);
  });
}

describe('calcularEstadisticasEntrenamiento', () => {
  it('ranking: nombre normalizado en SQL, cuentas distintas y HAVING con el umbral como parámetro', async () => {
    responder({});
    await calcularEstadisticasEntrenamiento('2026-11-28', 90);
    expect(consultar).toHaveBeenCalledTimes(5);

    const [sql, valores] = porSql('HAVING');
    expect(sql).toContain("btrim(regexp_replace(translate(lower(e.nombre), $3, $4), '\\s+', ' ', 'g')) AS nombre");
    expect(sql).toContain('count(DISTINCT e.usuario_id)::int AS cuentas');
    expect(sql).toMatch(/HAVING count\(DISTINCT e\.usuario_id\) >= \$5/);
    expect(sql).toMatch(/ORDER BY cuentas DESC, sesiones DESC, nombre\s+LIMIT \$6/);
    expect(valores).toEqual(['2026-11-28', 90, LETRAS_CON_MARCA, LETRAS_BASE, 3, 10]);
  });

  it('todas las consultas del periodo filtran por sesiones.fecha (usa idx_sesiones_fecha) y no tocan datos personales', async () => {
    responder({});
    await calcularEstadisticasEntrenamiento('2026-11-28', 30);
    for (const [sql, valores] of llamadas()) {
      expect(sql).not.toMatch(/auth\.users|email|perfiles|apodo/);
      if (sql.includes('FROM sesiones')) {
        expect(sql).toContain('s.fecha >= $1::date - ($2::int - 1)');
        expect(valores?.slice(0, 2)).toEqual(['2026-11-28', 30]);
      }
    }
    expect(porSql('extract(hour')[0]).toContain("s.created_at AT TIME ZONE 'America/Bogota'");
  });

  it('arma el resultado: umbral aplicado otra vez, reparto, 7 días, 24 horas y promedio de series', async () => {
    responder({
      // Si una consulta futura olvidara el HAVING, la fila de 2 cuentas no llega a la pantalla.
      populares: [
        { nombre: 'press de banca', cuentas: 4, sesiones: 30 },
        { nombre: 'ejercicio de una pareja', cuentas: 2, sesiones: 50 },
      ],
      tipos: [
        { tipo: 'peso', archivado: false, ejercicios: 3 },
        { tipo: 'calistenia', archivado: true, ejercicios: 1 },
      ],
      dias: [{ dia: 1, sesiones: 6 }],
      horas: [{ hora: 19, sesiones: 6 }],
      totales: [{ sesiones: 6, series: 20 }],
    });
    const estadisticas = await calcularEstadisticasEntrenamiento('2026-11-28', 90);
    expect(estadisticas.periodo).toBe(90);
    expect(estadisticas.populares).toEqual([{ nombre: 'press de banca', cuentas: 4, sesiones: 30 }]);
    expect(estadisticas.reparto).toMatchObject({ total: 4, activos: 3, archivados: 1 });
    expect(estadisticas.porDiaSemana).toHaveLength(7);
    expect(estadisticas.porDiaSemana[0]).toEqual({ dia: 1, sesiones: 6 });
    expect(estadisticas.porHora).toHaveLength(24);
    expect(estadisticas.porHora[19]).toEqual({ hora: 19, sesiones: 6 });
    expect(estadisticas).toMatchObject({ sesiones: 6, series: 20, promedioSeries: 3.3 });
  });

  it('sin datos: todo en cero, sin NaN', async () => {
    responder({});
    const estadisticas = await calcularEstadisticasEntrenamiento('2026-11-28', 365);
    expect(estadisticas).toMatchObject({ populares: [], sesiones: 0, series: 0, promedioSeries: 0 });
    expect(estadisticas.reparto.total).toBe(0);
    expect(estadisticas.porDiaSemana.every((d) => d.sesiones === 0)).toBe(true);
  });
});
