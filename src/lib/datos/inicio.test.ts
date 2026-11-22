// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const consultar = vi.fn();
vi.mock('@/lib/db/conexion', () => ({ consultar: (...args: unknown[]) => consultar(...args) }));

import { obtenerDatosInicio, sesionesDe } from '@/lib/datos/inicio';

beforeEach(() => consultar.mockReset());

describe('obtenerDatosInicio', () => {
  it('hace una sola consulta, filtrada por la cuenta, desde la fecha pedida y con 6 sesiones por ejercicio', async () => {
    consultar.mockResolvedValue([{ sesiones: [], marcas: [] }]);
    await obtenerDatosInicio('u1', '2026-10-26');
    expect(consultar).toHaveBeenCalledTimes(1);
    const [sql, valores] = consultar.mock.calls[0]!;
    expect(valores).toEqual(['u1', '2026-10-26', 6]);
    expect(sql).toContain('WHERE e.usuario_id = $1');
    // Las series solo se traen de las sesiones elegidas; las marcas se agregan en la base.
    expect(sql).toMatch(/FROM series x WHERE x\.sesion_id = el\.id/);
    expect(sql).toMatch(/max\(x\.peso_gramos\) AS peso_max/);
    expect(sql).toMatch(/'aproximacion'/);
  });

  it('devuelve listas vacías sin sesiones y una sesión sin series como lista vacía', async () => {
    consultar.mockResolvedValue([]);
    expect(await obtenerDatosInicio('u1', '2026-10-26')).toEqual({ sesiones: [], marcas: [] });

    consultar.mockResolvedValue([
      {
        sesiones: [
          { ejercicioId: 'e1', nombre: 'Press', tipo: 'peso', fecha: '2026-11-18', series: null },
          {
            ejercicioId: 'e2',
            nombre: 'Dominadas',
            tipo: 'calistenia',
            fecha: '2026-11-19',
            series: [{ reps: 8, pesoGramos: null }],
          },
        ],
        marcas: [
          {
            ejercicioId: 'e1',
            nombre: 'Press',
            tipo: 'peso',
            fecha: '2026-11-18',
            pesoMaxGramos: 40000,
            repsEnPesoMax: 10,
            repsMax: 10,
          },
        ],
      },
    ]);
    const datos = await obtenerDatosInicio('u1', '2026-10-26');
    expect(datos.sesiones[0]!.series).toEqual([]);
    expect(datos.marcas).toHaveLength(1);
    expect(sesionesDe(datos.sesiones, 'e2').map((sesion) => sesion.fecha)).toEqual(['2026-11-19']);
  });
});
