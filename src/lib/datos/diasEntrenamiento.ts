import type { PoolClient } from 'pg';
import { DIAS_ENTRENAMIENTO_POR_DEFECTO, ZONA_HORARIA } from '@/lib/config/gym';
import { consultar } from '@/lib/db/conexion';
import { diasEnFecha, normalizarDias, type TramoDias } from '@/lib/reglas/racha';

// Días de entrenamiento: historial por cuenta. Siempre con la cuenta de la sesión.

const HOY = `(now() AT TIME ZONE '${ZONA_HORARIA}')::date`;

export async function obtenerHistorialDias(usuarioId: string): Promise<TramoDias[]> {
  const filas = await consultar<{ dias: number[]; vigente_desde: string }>(
    `SELECT dias, vigente_desde::text AS vigente_desde FROM dias_entrenamiento
     WHERE usuario_id = $1 ORDER BY vigente_desde`,
    [usuarioId],
  );
  return filas.map((fila) => ({ dias: fila.dias.map(Number), vigenteDesde: fila.vigente_desde }));
}

export async function obtenerDiasVigentes(usuarioId: string, hoy: string): Promise<number[]> {
  const historial = await obtenerHistorialDias(usuarioId);
  return historial.length ? diasEnFecha(historial, hoy) : DIAS_ENTRENAMIENTO_POR_DEFECTO;
}

// Guarda los días vigentes desde hoy (si ya hubo un cambio hoy, lo actualiza). Ordena y quita repetidos.
// Elegir los días también marca como visto el aviso de las cuentas existentes.
export async function guardarDias(usuarioId: string, dias: number[], tx?: PoolClient): Promise<number[]> {
  const limpios = normalizarDias(dias);
  const ejecutar = (sql: string, valores: unknown[]) => (tx ? tx.query(sql, valores) : consultar(sql, valores));
  await ejecutar(
    `INSERT INTO dias_entrenamiento (usuario_id, dias, vigente_desde) VALUES ($1, $2::smallint[], ${HOY})
     ON CONFLICT (usuario_id, vigente_desde) DO UPDATE SET dias = EXCLUDED.dias, creado_en = now()`,
    [usuarioId, limpios],
  );
  await ejecutar('UPDATE perfiles SET aviso_dias_visto = true WHERE usuario_id = $1', [usuarioId]);
  return limpios;
}

export async function marcarAvisoDiasVisto(usuarioId: string): Promise<void> {
  await consultar('UPDATE perfiles SET aviso_dias_visto = true WHERE usuario_id = $1', [usuarioId]);
}
