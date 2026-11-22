import { consultar } from '@/lib/db/conexion';
import { SESIONES_TENDENCIA, type MarcaSesion, type SesionInicio } from '@/lib/reglas/inicio';
import type { TipoEjercicio } from '@/lib/reglas/ejercicio';

export interface DatosInicio {
  // De la más antigua a la más reciente: las sesiones desde `desde` (semana y gráfico de 4 semanas) más las
  // últimas SESIONES_TENDENCIA de cada ejercicio activo (mini tendencias y recomendación de cada tarjeta).
  sesiones: SesionInicio[];
  // Una fila por sesión de los ejercicios activos, con sus mejores marcas ya agregadas (para el último récord).
  marcas: MarcaSesion[];
}

interface FilaInicio {
  sesiones: {
    ejercicioId: string;
    nombre: string;
    tipo: TipoEjercicio;
    fecha: string;
    series: SesionInicio['series'] | null;
  }[];
  marcas: MarcaSesion[];
}

// Una sola consulta (el pool tiene 3 conexiones y /gym ya hace otras en paralelo). Solo trae series de las
// sesiones recientes; para los récords, la base agrega cada sesión en una fila de números.
export async function obtenerDatosInicio(usuarioId: string, desde: string): Promise<DatosInicio> {
  const [fila] = await consultar<FilaInicio>(
    `WITH numeradas AS (
       SELECT s.id, s.ejercicio_id, e.nombre, e.tipo, e.archivado, s.fecha, s.created_at,
              row_number() OVER (PARTITION BY s.ejercicio_id ORDER BY s.fecha DESC, s.created_at DESC) AS posicion
       FROM sesiones s JOIN ejercicios e ON e.id = s.ejercicio_id
       WHERE e.usuario_id = $1
     ),
     elegidas AS (
       SELECT * FROM numeradas
       WHERE fecha >= $2::date OR (posicion <= $3 AND NOT archivado)
     ),
     marcas AS (
       SELECT n.ejercicio_id, n.nombre, n.tipo, n.fecha, n.created_at, a.peso_max, a.reps_max,
              (SELECT max(y.reps) FROM series y
               WHERE y.sesion_id = n.id AND COALESCE(y.tipo_serie, 'normal') <> 'aproximacion'
                 AND y.peso_gramos = a.peso_max) AS reps_en_peso_max
       FROM numeradas n
       CROSS JOIN LATERAL (
         SELECT max(x.peso_gramos) AS peso_max, max(x.reps) AS reps_max
         FROM series x
         WHERE x.sesion_id = n.id AND COALESCE(x.tipo_serie, 'normal') <> 'aproximacion'
       ) a
       WHERE NOT n.archivado
     )
     SELECT
       COALESCE((
         SELECT json_agg(json_build_object(
                  'ejercicioId', el.ejercicio_id, 'nombre', el.nombre, 'tipo', el.tipo, 'fecha', el.fecha::text,
                  'series', (SELECT json_agg(json_build_object(
                                     'reps', x.reps, 'pesoGramos', x.peso_gramos, 'rir', x.rir,
                                     'tipoSerie', x.tipo_serie, 'extras', x.extras) ORDER BY x.numero)
                             FROM series x WHERE x.sesion_id = el.id))
                ORDER BY el.fecha, el.created_at)
         FROM elegidas el), '[]') AS sesiones,
       COALESCE((
         SELECT json_agg(json_build_object(
                  'ejercicioId', m.ejercicio_id, 'nombre', m.nombre, 'tipo', m.tipo, 'fecha', m.fecha::text,
                  'pesoMaxGramos', m.peso_max, 'repsEnPesoMax', m.reps_en_peso_max, 'repsMax', m.reps_max)
                ORDER BY m.fecha, m.created_at)
         FROM marcas m), '[]') AS marcas`,
    [usuarioId, desde, SESIONES_TENDENCIA],
  );

  return {
    sesiones: (fila?.sesiones ?? []).map((sesion) => ({ ...sesion, series: sesion.series ?? [] })),
    marcas: fila?.marcas ?? [],
  };
}

// Sesiones de un ejercicio (de la más antigua a la más reciente), para su tendencia y su recomendación.
export function sesionesDe(sesiones: SesionInicio[], ejercicioId: string): SesionInicio[] {
  return sesiones.filter((sesion) => sesion.ejercicioId === ejercicioId);
}
