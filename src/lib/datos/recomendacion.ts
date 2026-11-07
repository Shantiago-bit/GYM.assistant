import type { PoolClient } from 'pg';
import { pool } from '@/lib/db/conexion';
import { obtenerEjercicioBasico, type EjercicioBasico } from '@/lib/datos/ejercicios';
import { recomendarSiguiente, type Recomendacion } from '@/lib/reglas/progresion';
import type { TipoSerie } from '@/lib/reglas/tecnicas';

interface FilaSerieReciente {
  sesion_id: string;
  reps: number;
  rir: number | null;
  peso_gramos: number | null;
  tipo_serie: TipoSerie;
}

// RN-09: se evalúa la última sesión; la prueba inicial es una sesión más, así que cuenta si es la única.
// También se lee la penúltima, para detectar dos sesiones seguidas bajo el mínimo.
export async function recomendarSobreUltimaSesion(
  ejecutor: Pick<PoolClient, 'query'>,
  ejercicio: EjercicioBasico,
): Promise<Recomendacion> {
  const { rows } = await ejecutor.query<FilaSerieReciente>(
    `SELECT s.id AS sesion_id, x.reps, x.rir, x.peso_gramos, x.tipo_serie
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

  // Las series de aproximación no cuentan; las técnicas se evalúan con su serie principal.
  const efectivas = rows.filter((fila) => fila.tipo_serie !== 'aproximacion');
  const ultimaId = rows[0]!.sesion_id;
  const ultima = efectivas.filter((fila) => fila.sesion_id === ultimaId);
  const anterior = efectivas.filter((fila) => fila.sesion_id !== ultimaId);

  return recomendarSiguiente({
    tipo: ejercicio.tipo,
    rango: ejercicio.rango,
    pesoActualGramos: ejercicio.pesoRefGramos,
    metaRepsActual: ejercicio.metaReps,
    repsPorSerie: ultima.map((fila) => fila.reps),
    rirPorSerie: ultima.map((fila) => fila.rir),
    pesosPorSerie: ultima.map((fila) => fila.peso_gramos),
    repsSesionAnterior: anterior.map((fila) => fila.reps),
    metodo: ejercicio.metodo,
  });
}

export async function obtenerRecomendacion(usuarioId: string, id: string): Promise<Recomendacion> {
  const ejercicio = await obtenerEjercicioBasico(pool, usuarioId, id);
  return recomendarSobreUltimaSesion(pool, ejercicio);
}
