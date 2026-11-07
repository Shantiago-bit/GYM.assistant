import type { PoolClient } from 'pg';
import { pool } from '@/lib/db/conexion';
import { obtenerEjercicioBasico, type EjercicioBasico } from '@/lib/datos/ejercicios';
import { recomendarSiguiente, type Recomendacion } from '@/lib/reglas/progresion';

interface FilaSerieReciente {
  sesion_id: string;
  reps: number;
  rir: number | null;
}

// RN-09: se evalúa la última sesión; la prueba inicial es una sesión más, así que cuenta si es la única.
// También se lee la penúltima, para detectar dos sesiones seguidas bajo el mínimo.
export async function recomendarSobreUltimaSesion(
  ejecutor: Pick<PoolClient, 'query'>,
  ejercicio: EjercicioBasico,
): Promise<Recomendacion> {
  const { rows } = await ejecutor.query<FilaSerieReciente>(
    `SELECT s.id AS sesion_id, x.reps, x.rir
     FROM (
       SELECT id, fecha, created_at FROM sesiones
       WHERE ejercicio_id = $1
       ORDER BY fecha DESC, created_at DESC
       LIMIT 2
     ) s
     JOIN series x ON x.sesion_id = s.id
     ORDER BY s.fecha DESC, s.created_at DESC, x.numero`,
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

  const ultimaId = rows[0]!.sesion_id;
  const ultima = rows.filter((fila) => fila.sesion_id === ultimaId);
  const anterior = rows.filter((fila) => fila.sesion_id !== ultimaId);

  return recomendarSiguiente({
    tipo: ejercicio.tipo,
    rango: ejercicio.rango,
    pesoActualGramos: ejercicio.pesoRefGramos,
    metaRepsActual: ejercicio.metaReps,
    repsPorSerie: ultima.map((fila) => fila.reps),
    rirPorSerie: ultima.map((fila) => fila.rir),
    repsSesionAnterior: anterior.map((fila) => fila.reps),
  });
}

export async function obtenerRecomendacion(usuarioId: string, id: string): Promise<Recomendacion> {
  const ejercicio = await obtenerEjercicioBasico(pool, usuarioId, id);
  return recomendarSobreUltimaSesion(pool, ejercicio);
}
