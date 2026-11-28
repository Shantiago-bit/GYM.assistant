// @vitest-environment node
// Meta mensual del panel: lectura con quién la cambió y cambio con su auditoría en la misma transacción.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  consultar: vi.fn(),
  txQuery: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidateTag: mocks.revalidateTag, unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/db/conexion', () => ({
  consultar: (...args: unknown[]) => mocks.consultar(...args),
  conTransaccion: async (trabajo: (tx: { query: typeof mocks.txQuery }) => Promise<unknown>) =>
    trabajo({ query: mocks.txQuery }),
}));

import { ADMIN_META_ACTIVAS_POR_DEFECTO } from '@/lib/config/gym';
import { cambiarMetaActivasMes, obtenerMetaDetallada } from '@/lib/datos/admin';

const ADMIN = '00000000-0000-4000-8000-0000000000aa';

// La primera consulta de la transacción es el SELECT ... FOR UPDATE; las demás devuelven filas vacías.
const metaGuardada = (valor: number | null) =>
  mocks.txQuery.mockImplementation(async (sql: string) =>
    /FOR UPDATE/.test(sql) && valor !== null ? { rows: [{ valor }] } : { rows: [] },
  );

beforeEach(() => vi.clearAllMocks());

describe('obtenerMetaDetallada', () => {
  it('sin meta guardada usa la de por defecto y no tiene autor', async () => {
    mocks.consultar.mockResolvedValue([]);
    expect(await obtenerMetaDetallada()).toEqual({
      valor: ADMIN_META_ACTIVAS_POR_DEFECTO,
      guardada: false,
      actualizadoEn: null,
      actualizadoPor: null,
    });
  });

  it('con meta guardada devuelve el valor, la fecha y el apodo de quien la cambió', async () => {
    mocks.consultar.mockResolvedValue([{ valor: 80, actualizado_en: '2026-11-20 10:00:00+00', actualizado_por: 'Ana' }]);
    expect(await obtenerMetaDetallada()).toEqual({
      valor: 80,
      guardada: true,
      actualizadoEn: '2026-11-20 10:00:00+00',
      actualizadoPor: 'Ana',
    });
    expect(mocks.consultar.mock.calls[0]![0]).toContain("WHERE m.clave = 'personas_activas_mes'");
  });
});

describe('cambiarMetaActivasMes', () => {
  it('bloquea la fila, hace upsert y audita {anterior, nuevo} en la misma transacción; invalida la caché', async () => {
    metaGuardada(50);
    expect(await cambiarMetaActivasMes(120, ADMIN)).toEqual({ anterior: 50, nuevo: 120, cambiada: true });

    const sqls = mocks.txQuery.mock.calls.map(([sql]) => sql as string);
    expect(sqls).toHaveLength(3);
    expect(sqls[0]).toMatch(/FOR UPDATE/);
    expect(sqls[1]).toMatch(/INSERT INTO metas_admin[\s\S]*ON CONFLICT \(clave\) DO UPDATE/);
    expect(mocks.txQuery.mock.calls[1]![1]).toEqual([120, ADMIN]);
    expect(sqls[2]).toMatch(/INSERT INTO auditoria_admin[\s\S]*'cambiar_meta'/);
    const [adminId, detalle] = mocks.txQuery.mock.calls[2]![1] as [string, string];
    expect(adminId).toBe(ADMIN);
    expect(JSON.parse(detalle)).toEqual({ meta: 'personas_activas_mes', anterior: 50, nuevo: 120 });
    expect(mocks.revalidateTag).toHaveBeenCalledWith('admin');
  });

  it('sin meta guardada, el "anterior" auditado es la meta por defecto', async () => {
    metaGuardada(null);
    expect(await cambiarMetaActivasMes(ADMIN_META_ACTIVAS_POR_DEFECTO, ADMIN)).toEqual({
      anterior: ADMIN_META_ACTIVAS_POR_DEFECTO,
      nuevo: ADMIN_META_ACTIVAS_POR_DEFECTO,
      cambiada: true,
    });
    // Se guarda aunque coincida con la de por defecto: así queda quién la fijó.
    expect(mocks.txQuery).toHaveBeenCalledTimes(3);
  });

  it('si el valor ya era ese, no escribe, no audita ni invalida la caché', async () => {
    metaGuardada(75);
    expect(await cambiarMetaActivasMes(75, ADMIN)).toEqual({ anterior: 75, nuevo: 75, cambiada: false });
    expect(mocks.txQuery).toHaveBeenCalledTimes(1);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });
});
