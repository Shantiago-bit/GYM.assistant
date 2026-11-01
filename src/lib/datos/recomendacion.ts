import type { PoolClient } from 'pg';
import { pool } from '@/lib/db/conexion';
import { obtenerEjercicioBasico, type EjercicioBasico } from '@/lib/datos/ejercicios';
import { recomendarSiguiente, type Recomendacion } from '@/lib/reglas/progresion';

// RN-09: se evalúa la última sesión; la prueba inicial es una sesión más, así que cuenta si es la única.
export async function recomendarSobreUltimaSesion(
  ejecutor: Pick<PoolClient, 'query'>,
  ejercicio: EjercicioBasico,
): Promise<Recomendacion> {
  const { rows } = await ejecutor.query<{ reps: number }>(
    `SELECT reps FROM series
     WHERE sesion_id = (
       SELECT id FROM sesiones
       WHERE ejercicio_id = $1
       ORDER BY fecha DESC, created_at DESC
       LIMIT 1
     )
     ORDER BY numero`,
    [ejercicio.id],
  );

  if (rows.length === 0) {
    return {
      accion: 'mantener',
      pesoSugeridoGramos: ejercicio.pesoRefGramos,
      metaRepsSugerida: ejercicio.metaReps,
      mensaje: 'Registra tu prueba inicial para recibir una recomendación.',
    };
  }

  return recomendarSiguiente({
    tipo: ejercicio.tipo,
    rango: ejercicio.rango,
    pesoActualGramos: ejercicio.pesoRefGramos,
    metaRepsActual: ejercicio.metaReps,
    repsPorSerie: rows.map((fila) => fila.reps),
  });
}

export async function obtenerRecomendacion(usuarioId: string, id: string): Promise<Recomendacion> {
  const ejercicio = await obtenerEjercicioBasico(pool, usuarioId, id);
  return recomendarSobreUltimaSesion(pool, ejercicio);
}
