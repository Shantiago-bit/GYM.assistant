// @vitest-environment node
// Correos del panel: estadísticas agregadas en SQL y lista paginada. Nunca se lee destinatario_hash ni el correo.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const consultar = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/db/conexion', () => ({ consultar: (...args: unknown[]) => consultar(...args), conTransaccion: vi.fn() }));

import { calcularEstadisticasCorreos, listarCorreos } from '@/lib/datos/admin';
import { leerFiltrosCorreos } from '@/lib/reglas/correosAdmin';

// Con llaves: si beforeEach devuelve una función, Vitest la ejecuta al terminar cada prueba (y llamaría al mock).
beforeEach(() => {
  consultar.mockReset();
});

// Responde según la consulta: conteos, días o duraciones.
function responder(datos: { conteos?: unknown[]; dias?: unknown[]; duraciones?: unknown[] }) {
  consultar.mockImplementation(async (sql: string) => {
    if (sql.includes('GROUP BY tipo, resultado, motivo_omision')) return datos.conteos ?? [];
    if (sql.includes('AS dia')) return datos.dias ?? [];
    if (sql.includes('avg(duracion_ms)')) return datos.duraciones ?? [];
    throw new Error(`Consulta inesperada: ${sql}`);
  });
}

describe('calcularEstadisticasCorreos', () => {
  it('tres consultas agregadas, con el periodo como parámetro y el gráfico siempre de 30 días', async () => {
    responder({});
    await calcularEstadisticasCorreos('2026-11-28', 7);
    expect(consultar).toHaveBeenCalledTimes(3);
    const llamadas = consultar.mock.calls as [string, unknown[]][];
    const porSql = (texto: string) => llamadas.find(([sql]) => sql.includes(texto))!;
    expect(porSql('motivo_omision AS motivo')[1]).toEqual(['2026-11-28', 7]);
    expect(porSql('AS dia')[1]).toEqual(['2026-11-28', 30]);
    expect(porSql('avg(duracion_ms)')[1]).toEqual(['2026-11-28', 7]);
    for (const [sql] of llamadas) {
      // Límite calculado una vez (usa el índice de creado_en), sin convertir cada fila en el WHERE.
      expect(sql).toMatch(/WHERE creado_en >= \(\(\$1::date - \(\$2::int - 1\)\)::timestamp AT TIME ZONE 'America\/Bogota'\)/);
      expect(sql).toMatch(/count\(|avg\(/);
      expect(sql).not.toMatch(/destinatario_hash|destinatario_mascara|usuario_id|auth\.users/);
    }
  });

  it('agrupa los conteos, completa los 30 días y pasa las duraciones por proveedor', async () => {
    responder({
      conteos: [
        { tipo: 'confirmacion', resultado: 'aceptado', motivo: null, total: 3 },
        { tipo: 'confirmacion', resultado: 'error', motivo: null, total: 1 },
        { tipo: 'reenvio_confirmacion', resultado: 'omitido', motivo: 'reenvio_reciente', total: 2 },
      ],
      dias: [{ dia: '2026-11-27', aceptados: 3, fallidos: 1, omitidos: 2 }],
      duraciones: [{ proveedor: 'gmail', envios: 4, media_ms: 812 }],
    });
    const estadisticas = await calcularEstadisticasCorreos('2026-11-28', 30);
    expect(estadisticas.periodo).toBe(30);
    expect(estadisticas.resumen.porResultado).toEqual({ aceptado: 3, rechazado: 0, error: 1, omitido: 2 });
    expect(estadisticas.resumen.tasa).toBe(75);
    expect(estadisticas.dias).toHaveLength(30);
    expect(estadisticas.dias.at(-1)).toEqual({ dia: '2026-11-28', aceptados: 0, fallidos: 0, omitidos: 0 });
    expect(estadisticas.dias.at(-2)).toEqual({ dia: '2026-11-27', aceptados: 3, fallidos: 1, omitidos: 2 });
    expect(estadisticas.duracionPorProveedor).toEqual([{ proveedor: 'gmail', envios: 4, mediaMs: 812 }]);
  });
});

describe('listarCorreos', () => {
  const FILA = {
    id: '6f1c',
    fecha: '2026-11-27 15:00:00+00',
    tipo: 'recuperacion',
    destinatario_mascara: 'd•••••7@example.com',
    usuario_id: '00000000-0000-4000-8000-0000000000bb',
    resultado: 'error',
    motivo: null,
    proveedor: 'gmail',
    error: 'x'.repeat(121),
    duracion_ms: 950,
    total: 26,
  };

  it('sin filtros: sin WHERE, primera página de 25 y solo la máscara del destinatario', async () => {
    consultar.mockResolvedValue([FILA]);
    const { filas, total } = await listarCorreos(leerFiltrosCorreos({}));
    const [sql, valores] = consultar.mock.calls[0]!;
    expect(sql).not.toContain('WHERE');
    expect(sql).toMatch(/ORDER BY c\.creado_en DESC, c\.id DESC\s+LIMIT 25 OFFSET 0/);
    expect(sql).toContain('left(c.error, 121)');
    expect(sql).not.toMatch(/destinatario_hash|auth\.users|email/);
    expect(valores).toEqual([]);
    expect(total).toBe(26);
    expect(filas[0]).toMatchObject({ destinatarioMascara: 'd•••••7@example.com', resultado: 'error', duracionMs: 950 });
    expect(filas[0]!.error).toHaveLength(120);
    expect(filas[0]!.error!.endsWith('…')).toBe(true);
  });

  it('cada filtro va como parámetro, las fechas son días de Bogotá (hasta incluido) y pagina con OFFSET', async () => {
    consultar.mockResolvedValue([]);
    const filtros = leerFiltrosCorreos({
      tipo: 'recuperacion',
      resultado: 'error',
      proveedor: 'resend',
      desde: '2026-11-01',
      hasta: '2026-11-15',
      pagina: '3',
    });
    expect(await listarCorreos(filtros)).toEqual({ filas: [], total: 0 });
    const [sql, valores] = consultar.mock.calls[0]!;
    expect(valores).toEqual(['recuperacion', 'error', 'resend', '2026-11-01', '2026-11-15']);
    expect(sql).toContain('c.tipo = $1 AND c.resultado = $2 AND c.proveedor = $3');
    expect(sql).toContain("c.creado_en >= ($4::date::timestamp AT TIME ZONE 'America/Bogota')");
    expect(sql).toContain("c.creado_en < (($5::date + 1)::timestamp AT TIME ZONE 'America/Bogota')");
    expect(sql).toMatch(/LIMIT 25 OFFSET 50/);
  });
});
