import { consultar } from '@/lib/db/conexion';
import type { ProgresoEjercicio, ResumenEntrenamiento } from '@/lib/datos/tipos';
import type { TipoEjercicio } from '@/lib/reglas/ejercicio';
import { indicadorProgreso, mejorSerie, type SerieMedida } from '@/lib/reglas/tendencia';

interface RegistroPeriodo {
  ejercicio_id: string;
  nombre: string;
  tipo: TipoEjercicio;
  series: SerieMedida[];
}

export async function obtenerResumen(
  usuarioId: string,
  desde: string,
  hasta: string,
): Promise<ResumenEntrenamiento> {
  const filas = await consultar<RegistroPeriodo>(
    `SELECT e.id AS ejercicio_id, e.nombre, e.tipo,
       COALESCE(
         json_agg(json_build_object('reps', x.reps, 'pesoGramos', x.peso_gramos))
           FILTER (WHERE x.id IS NOT NULL),
         '[]'
       ) AS series
     FROM sesiones s
     JOIN ejercicios e ON e.id = s.ejercicio_id
     LEFT JOIN series x ON x.sesion_id = s.id
     WHERE e.usuario_id = $1 AND s.fecha BETWEEN $2 AND $3
     GROUP BY e.id, s.id
     ORDER BY lower(e.nombre), s.fecha, s.created_at`,
    [usuarioId, desde, hasta],
  );

  const porEjercicio = new Map<string, ProgresoEjercicio>();

  for (const fila of filas) {
    const mejor = mejorSerie(fila.series);
    if (!mejor) continue;

    const previo = porEjercicio.get(fila.ejercicio_id);
    porEjercicio.set(fila.ejercicio_id, {
      id: fila.ejercicio_id,
      nombre: fila.nombre,
      tipo: fila.tipo,
      sesiones: (previo?.sesiones ?? 0) + 1,
      inicial: previo?.inicial ?? mejor,
      final: mejor,
      indicador: indicadorProgreso(previo?.inicial ?? mejor, mejor),
    });
  }

  return {
    desde,
    hasta,
    totalSesiones: filas.length,
    ejerciciosTrabajados: porEjercicio.size,
    ejercicios: [...porEjercicio.values()],
  };
}
