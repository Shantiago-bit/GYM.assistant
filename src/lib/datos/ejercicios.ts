import type { PoolClient } from 'pg';
import { LIMITE_LISTADO } from '@/lib/config/gym';
import { consultar, pool } from '@/lib/db/conexion';
import { obtenerRecomendacion } from '@/lib/datos/recomendacion';
import { listarSesiones } from '@/lib/datos/sesiones';
import type { DatosEjercicio, DetalleEjercicio, FilaEjercicio } from '@/lib/datos/tipos';
import { kgAGramos } from '@/lib/formato';
import { rangoPorTipo, validarEjercicio, type TipoEjercicio } from '@/lib/reglas/ejercicio';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RegistroEjercicio {
  id: string;
  nombre: string;
  tipo: TipoEjercicio;
  rango_min: number;
  rango_max: number;
  peso_ref_gramos: number | null;
  nivel: string | null;
  meta_reps: number;
  archivado: boolean;
  total_sesiones: number;
  ultima_fecha: string | null;
}

function mapearEjercicio(fila: RegistroEjercicio): FilaEjercicio {
  return {
    id: fila.id,
    nombre: fila.nombre,
    tipo: fila.tipo,
    rango: [fila.rango_min, fila.rango_max],
    pesoRefGramos: fila.peso_ref_gramos,
    nivel: fila.nivel,
    metaReps: fila.meta_reps,
    archivado: fila.archivado,
    totalSesiones: fila.total_sesiones,
    ultimaFecha: fila.ultima_fecha,
  };
}

export async function listarEjercicios(
  f: { incluirArchivados?: boolean } = {},
): Promise<FilaEjercicio[]> {
  const filas = await consultar<RegistroEjercicio>(
    `SELECT * FROM v_ejercicios
     WHERE $1 OR NOT archivado
     ORDER BY lower(nombre)
     LIMIT $2`,
    [f.incluirArchivados ?? false, LIMITE_LISTADO],
  );

  return filas.map(mapearEjercicio);
}

export async function crearEjercicio(d: DatosEjercicio): Promise<{ id: string }> {
  const [minPorDefecto, maxPorDefecto] = rangoPorTipo(d.tipo);
  const rangoMin = d.rangoMin ?? minPorDefecto;
  const rangoMax = d.rangoMax ?? maxPorDefecto;
  const pesoRefGramos = d.pesoRefKg === undefined ? null : kgAGramos(d.pesoRefKg);
  const nombre = d.nombre.trim();
  const nivel = d.tipo === 'calistenia' && d.nivel?.trim() ? d.nivel.trim() : null;

  validarEjercicio({ nombre, tipo: d.tipo, pesoRefGramos, nivel, rangoMin, rangoMax });

  const filas = await consultar<{ id: string }>(
    `INSERT INTO ejercicios (nombre, tipo, rango_min, rango_max, peso_ref_gramos, nivel, meta_reps)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [nombre, d.tipo, rangoMin, rangoMax, pesoRefGramos, nivel, rangoMax],
  );

  return { id: filas[0]!.id };
}

export interface EjercicioBasico extends FilaEjercicio {
  tienePruebaInicial: boolean;
}

export async function obtenerEjercicioBasico(
  ejecutor: Pick<PoolClient, 'query'>,
  id: string,
): Promise<EjercicioBasico> {
  // Un id mal formado haría fallar la consulta con un error interno.
  if (!UUID.test(id)) {
    throw new ErrorDeNegocio('EJERCICIO_NO_ENCONTRADO');
  }

  const { rows } = await ejecutor.query<RegistroEjercicio & { tiene_prueba: boolean }>(
    `SELECT v.*, EXISTS (
       SELECT 1 FROM sesiones s WHERE s.ejercicio_id = v.id AND s.es_prueba
     ) AS tiene_prueba
     FROM v_ejercicios v
     WHERE v.id = $1`,
    [id],
  );
  const fila = rows[0];

  if (!fila) {
    throw new ErrorDeNegocio('EJERCICIO_NO_ENCONTRADO');
  }

  return { ...mapearEjercicio(fila), tienePruebaInicial: fila.tiene_prueba };
}

export async function obtenerEjercicio(id: string): Promise<DetalleEjercicio> {
  const { tienePruebaInicial, ...ejercicio } = await obtenerEjercicioBasico(pool, id);
  const [sesiones, recomendacion] = await Promise.all([
    listarSesiones(id),
    obtenerRecomendacion(id),
  ]);

  return { ejercicio, tienePruebaInicial, sesiones, recomendacion };
}

export async function archivarEjercicio(id: string): Promise<void> {
  await obtenerEjercicioBasico(pool, id);
  await consultar('UPDATE ejercicios SET archivado = true WHERE id = $1', [id]);
}

export async function cerrarConexiones(): Promise<void> {
  await pool.end();
}
