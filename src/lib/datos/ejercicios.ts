import type { PoolClient } from 'pg';
import { LIMITE_LISTADO } from '@/lib/config/gym';
import { conTransaccion, consultar, pool } from '@/lib/db/conexion';
import { obtenerRecomendacion } from '@/lib/datos/recomendacion';
import { listarSesiones } from '@/lib/datos/sesiones';
import type {
  DatosEjercicio,
  DetalleEjercicio,
  EjercicioListado,
  FilaEjercicio,
} from '@/lib/datos/tipos';
import { kgAGramos } from '@/lib/formato';
import {
  mensajeEjercicioArchivado,
  rangoPorTipo,
  validarEjercicio,
  type Enfoque,
  type TipoEjercicio,
} from '@/lib/reglas/ejercicio';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { metodoValido, planDeSesion, type Metodo } from '@/lib/reglas/metodos';
import { listoParaSubir } from '@/lib/reglas/progresion';
import type { TipoSerie } from '@/lib/reglas/tecnicas';

function exigirMetodoValido(tipo: TipoEjercicio, metodo: Metodo): void {
  if (!metodoValido(tipo, metodo)) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Ese método de series solo está disponible para ejercicios de peso.');
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RegistroEjercicio {
  id: string;
  nombre: string;
  tipo: TipoEjercicio;
  enfoque: Enfoque;
  metodo: Metodo;
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
    enfoque: fila.enfoque,
    metodo: fila.metodo,
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
  usuarioId: string,
  f: { incluirArchivados?: boolean } = {},
): Promise<EjercicioListado[]> {
  // Se trae la última sesión de cada ejercicio y "Listo para subir" lo decide la misma regla que la
  // recomendación (series clave del método, sin aproximaciones, con el peso de referencia).
  const filas = await consultar<
    RegistroEjercicio & { ultimas_series: { reps: number; pesoGramos: number | null; tipoSerie: TipoSerie }[] }
  >(
    `SELECT v.*, COALESCE(
       (SELECT json_agg(
                 json_build_object('reps', x.reps, 'pesoGramos', x.peso_gramos, 'tipoSerie', x.tipo_serie)
                 ORDER BY x.numero
               )
        FROM series x
        WHERE x.sesion_id = v.ultima_sesion_id),
       '[]'
     ) AS ultimas_series
     FROM v_ejercicios v
     WHERE v.usuario_id = $1 AND ($2 OR NOT v.archivado)
     ORDER BY lower(v.nombre)
     LIMIT $3`,
    [usuarioId, f.incluirArchivados ?? false, LIMITE_LISTADO],
  );

  return filas.map((fila) => {
    const ejercicio = mapearEjercicio(fila);
    return {
      ...ejercicio,
      listoParaSubir: listoParaSubir({
        tipo: ejercicio.tipo,
        metodo: ejercicio.metodo,
        rango: ejercicio.rango,
        pesoRefGramos: ejercicio.pesoRefGramos,
        series: fila.ultimas_series,
      }),
    };
  });
}

export async function crearEjercicio(usuarioId: string, d: DatosEjercicio): Promise<{ id: string }> {
  const enfoque = d.enfoque ?? 'hipertrofia';
  const metodo = d.metodo ?? 'rectas';
  exigirMetodoValido(d.tipo, metodo);
  const [minPorDefecto, maxPorDefecto] = rangoPorTipo(d.tipo, enfoque);
  const rangoMin = d.rangoMin ?? minPorDefecto;
  const rangoMax = d.rangoMax ?? maxPorDefecto;
  const pesoRefGramos = d.pesoRefKg === undefined ? null : kgAGramos(d.pesoRefKg);
  const nombre = d.nombre.trim();
  const nivel = d.tipo === 'calistenia' && d.nivel?.trim() ? d.nivel.trim() : null;

  validarEjercicio({ nombre, tipo: d.tipo, pesoRefGramos, nivel, rangoMin, rangoMax });

  // El nombre es único por cuenta también entre los archivados: si choca con uno archivado, se ofrece
  // restaurarlo. Si choca con uno activo, el índice único responde EJERCICIO_DUPLICADO como siempre.
  const archivados = await consultar<{ id: string; nombre: string }>(
    `SELECT id, nombre FROM ejercicios
     WHERE usuario_id = $1 AND archivado AND lower(btrim(nombre)) = lower(btrim($2))`,
    [usuarioId, nombre],
  );
  const archivado = archivados[0];
  if (archivado) {
    throw new ErrorDeNegocio('EJERCICIO_ARCHIVADO', mensajeEjercicioArchivado(archivado.nombre), { id: archivado.id });
  }

  const filas = await consultar<{ id: string }>(
    `INSERT INTO ejercicios (usuario_id, nombre, tipo, enfoque, metodo, rango_min, rango_max, peso_ref_gramos, nivel, meta_reps)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [usuarioId, nombre, d.tipo, enfoque, metodo, rangoMin, rangoMax, pesoRefGramos, nivel, rangoMax],
  );

  return { id: filas[0]!.id };
}

export interface EjercicioBasico extends FilaEjercicio {
  tienePruebaInicial: boolean;
}

// Toda operación sobre un ejercicio pasa por aquí: el de otra cuenta se trata como inexistente.
export async function obtenerEjercicioBasico(
  ejecutor: Pick<PoolClient, 'query'>,
  usuarioId: string,
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
     WHERE v.id = $1 AND v.usuario_id = $2`,
    [id, usuarioId],
  );
  const fila = rows[0];

  if (!fila) {
    throw new ErrorDeNegocio('EJERCICIO_NO_ENCONTRADO');
  }

  return { ...mapearEjercicio(fila), tienePruebaInicial: fila.tiene_prueba };
}

export async function obtenerEjercicio(usuarioId: string, id: string): Promise<DetalleEjercicio> {
  const { tienePruebaInicial, ...ejercicio } = await obtenerEjercicioBasico(pool, usuarioId, id);
  const [sesiones, recomendacion] = await Promise.all([
    listarSesiones(usuarioId, id),
    obtenerRecomendacion(usuarioId, id),
  ]);

  // La próxima sesión repite la cantidad de series de la última.
  const plan = planDeSesion({
    metodo: ejercicio.metodo,
    tipo: ejercicio.tipo,
    rango: ejercicio.rango,
    metaReps: recomendacion.metaRepsSugerida,
    pesoGramos: recomendacion.pesoSugeridoGramos,
    cantidad: sesiones[0]?.series.length ?? 3,
  });

  return { ejercicio, tienePruebaInicial, sesiones, recomendacion, plan };
}

export async function archivarEjercicio(usuarioId: string, id: string): Promise<void> {
  await obtenerEjercicioBasico(pool, usuarioId, id);
  await consultar('UPDATE ejercicios SET archivado = true WHERE id = $1 AND usuario_id = $2', [
    id,
    usuarioId,
  ]);
}

// Devuelve un ejercicio archivado a la lista activa con todo su histórico. Si ya estaba activo, no cambia nada.
export async function restaurarEjercicio(usuarioId: string, id: string): Promise<void> {
  await obtenerEjercicioBasico(pool, usuarioId, id);
  await consultar('UPDATE ejercicios SET archivado = false WHERE id = $1 AND usuario_id = $2', [
    id,
    usuarioId,
  ]);
}

// Borra el ejercicio para siempre. Las claves foráneas borran en cascada sus sesiones y, con ellas, sus series.
export async function eliminarEjercicio(
  usuarioId: string,
  id: string,
): Promise<{ sesiones: number; series: number }> {
  return conTransaccion(async (tx) => {
    await obtenerEjercicioBasico(tx, usuarioId, id);
    const { rows } = await tx.query<{ sesiones: number; series: number }>(
      `SELECT COUNT(DISTINCT s.id)::int AS sesiones, COUNT(x.id)::int AS series
       FROM sesiones s LEFT JOIN series x ON x.sesion_id = s.id
       WHERE s.ejercicio_id = $1`,
      [id],
    );
    await tx.query('DELETE FROM ejercicios WHERE id = $1 AND usuario_id = $2', [id, usuarioId]);
    return { sesiones: rows[0]?.sesiones ?? 0, series: rows[0]?.series ?? 0 };
  });
}

export async function actualizarNivel(usuarioId: string, id: string, nivel: string): Promise<void> {
  const ejercicio = await obtenerEjercicioBasico(pool, usuarioId, id);

  if (ejercicio.tipo !== 'calistenia') {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Solo los ejercicios de calistenia tienen nivel.');
  }

  await consultar('UPDATE ejercicios SET nivel = $1 WHERE id = $2 AND usuario_id = $3', [
    nivel.trim(),
    id,
    usuarioId,
  ]);
}

// La meta de repeticiones se ajusta para quedar dentro del rango nuevo.
export async function actualizarEnfoque(
  usuarioId: string,
  id: string,
  d: { enfoque: Enfoque; metodo?: Metodo | undefined; rangoMin: number; rangoMax: number },
): Promise<void> {
  const ejercicio = await obtenerEjercicioBasico(pool, usuarioId, id);
  const metodo = d.metodo ?? ejercicio.metodo;
  exigirMetodoValido(ejercicio.tipo, metodo);

  if (!Number.isInteger(d.rangoMin) || !Number.isInteger(d.rangoMax) || d.rangoMin < 1 || d.rangoMin > d.rangoMax) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'El rango objetivo no es válido.');
  }

  const metaReps = Math.min(Math.max(ejercicio.metaReps, d.rangoMin), d.rangoMax);

  await consultar(
    `UPDATE ejercicios SET enfoque = $1, metodo = $2, rango_min = $3, rango_max = $4, meta_reps = $5
     WHERE id = $6 AND usuario_id = $7`,
    [d.enfoque, metodo, d.rangoMin, d.rangoMax, metaReps, id, usuarioId],
  );
}

export async function cerrarConexiones(): Promise<void> {
  await pool.end();
}
