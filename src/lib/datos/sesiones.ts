import type { PoolClient } from 'pg';
import { LIMITE_LISTADO } from '@/lib/config/gym';
import { conTransaccion, pool } from '@/lib/db/conexion';
import { obtenerEjercicioBasico } from '@/lib/datos/ejercicios';
import { recomendarSobreUltimaSesion } from '@/lib/datos/recomendacion';
import type {
  DatosEntrenamiento,
  DatosSesion,
  ResultadoEntrenamiento,
  Serie,
  SerieKg,
  Sesion,
} from '@/lib/datos/tipos';
import { kgAGramos } from '@/lib/formato';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { esFechaFutura, esFechaValida, hoyBogota } from '@/lib/reglas/fechas';
import { estadoTrasSesion } from '@/lib/reglas/progresion';
import { validarSesion, type SerieEntrada } from '@/lib/reglas/sesion';

const CAMPOS_SESION = `
  s.id, s.fecha, s.es_prueba,
  COALESCE(
    json_agg(
      json_build_object('numero', x.numero, 'reps', x.reps, 'pesoGramos', x.peso_gramos)
      ORDER BY x.numero
    ) FILTER (WHERE x.id IS NOT NULL),
    '[]'
  ) AS series`;

interface RegistroSesion {
  id: string;
  fecha: string;
  es_prueba: boolean;
  series: Serie[];
}

function mapearSesion(fila: RegistroSesion): Sesion {
  return { id: fila.id, fecha: fila.fecha, esPrueba: fila.es_prueba, series: fila.series };
}

function aSeriesEnGramos(series: SerieKg[]): SerieEntrada[] {
  return series.map((serie) => ({
    reps: serie.reps,
    pesoGramos: serie.pesoKg === undefined ? null : kgAGramos(serie.pesoKg),
  }));
}

async function insertarSesion(
  tx: PoolClient,
  d: { ejercicioId: string; fecha: string; esPrueba: boolean; series: SerieEntrada[] },
): Promise<Sesion> {
  const { rows } = await tx.query<{ id: string }>(
    'INSERT INTO sesiones (ejercicio_id, fecha, es_prueba) VALUES ($1, $2, $3) RETURNING id',
    [d.ejercicioId, d.fecha, d.esPrueba],
  );
  const sesionId = rows[0]!.id;

  for (const [indice, serie] of d.series.entries()) {
    await tx.query(
      'INSERT INTO series (sesion_id, numero, reps, peso_gramos) VALUES ($1, $2, $3, $4)',
      [sesionId, indice + 1, serie.reps, serie.pesoGramos ?? null],
    );
  }

  const leida = await tx.query<RegistroSesion>(
    `SELECT ${CAMPOS_SESION}
     FROM sesiones s
     LEFT JOIN series x ON x.sesion_id = s.id
     WHERE s.id = $1
     GROUP BY s.id`,
    [sesionId],
  );

  return mapearSesion(leida.rows[0]!);
}

export async function registrarPruebaInicial(id: string, seriesKg: SerieKg[]): Promise<Sesion> {
  return conTransaccion(async (tx) => {
    const ejercicio = await obtenerEjercicioBasico(tx, id);

    if (ejercicio.tienePruebaInicial) {
      throw new ErrorDeNegocio('PRUEBA_YA_REGISTRADA');
    }

    const series = aSeriesEnGramos(seriesKg);
    validarSesion(series, ejercicio.tipo);

    const sesion = await insertarSesion(tx, {
      ejercicioId: id,
      fecha: hoyBogota(),
      esPrueba: true,
      series,
    });

    // CU-02: la prueba fija el estado inicial, aunque difiera del peso declarado al crear el ejercicio.
    if (ejercicio.tipo === 'peso') {
      const pesoInicial = Math.max(...series.map((serie) => serie.pesoGramos ?? 0));
      await tx.query('UPDATE ejercicios SET peso_ref_gramos = $1 WHERE id = $2', [pesoInicial, id]);
    }

    return sesion;
  });
}

export async function registrarSesionEnTransaccion(
  tx: PoolClient,
  id: string,
  d: DatosSesion,
): Promise<Sesion> {
  const ejercicio = await obtenerEjercicioBasico(tx, id);

  if (!ejercicio.tienePruebaInicial) {
    throw new ErrorDeNegocio('PRUEBA_REQUERIDA');
  }

  const series = aSeriesEnGramos(d.series);
  validarSesion(series, ejercicio.tipo);

  const fecha = d.fecha ?? hoyBogota();
  if (!esFechaValida(fecha) || esFechaFutura(fecha, hoyBogota())) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'La fecha de la sesión no es válida.');
  }

  // Se calcula antes de insertar: es lo que el usuario tenía sugerido para esta sesión.
  const recomendacion = await recomendarSobreUltimaSesion(tx, ejercicio);
  const sesion = await insertarSesion(tx, { ejercicioId: id, fecha, esPrueba: false, series });

  const estado = estadoTrasSesion({
    tipo: ejercicio.tipo,
    pesoActualGramos: ejercicio.pesoRefGramos,
    metaRepsActual: ejercicio.metaReps,
    recomendacion,
    pesosDeLaSesion: series.map((serie) => serie.pesoGramos ?? null),
  });
  await tx.query('UPDATE ejercicios SET peso_ref_gramos = $1, meta_reps = $2 WHERE id = $3', [
    estado.pesoRefGramos,
    estado.metaReps,
    id,
  ]);

  return sesion;
}

export async function registrarSesion(id: string, d: DatosSesion): Promise<Sesion> {
  return conTransaccion((tx) => registrarSesionEnTransaccion(tx, id, d));
}

// Una sesión por ejercicio, en una sola transacción: un error no deja el entrenamiento a medias.
export async function registrarEntrenamiento(
  d: DatosEntrenamiento,
): Promise<ResultadoEntrenamiento[]> {
  await conTransaccion(async (tx) => {
    for (const { ejercicioId, series } of d.ejercicios) {
      await registrarSesionEnTransaccion(tx, ejercicioId, { fecha: d.fecha, series });
    }
  });

  const resultados: ResultadoEntrenamiento[] = [];

  for (const { ejercicioId } of d.ejercicios) {
    const ejercicio = await obtenerEjercicioBasico(pool, ejercicioId);
    resultados.push({
      ejercicioId,
      nombre: ejercicio.nombre,
      recomendacion: await recomendarSobreUltimaSesion(pool, ejercicio),
    });
  }

  return resultados;
}

export async function listarSesiones(id: string): Promise<Sesion[]> {
  await obtenerEjercicioBasico(pool, id);

  const { rows } = await pool.query<RegistroSesion>(
    `SELECT ${CAMPOS_SESION}
     FROM sesiones s
     LEFT JOIN series x ON x.sesion_id = s.id
     WHERE s.ejercicio_id = $1
     GROUP BY s.id
     ORDER BY s.fecha DESC, s.created_at DESC
     LIMIT $2`,
    [id, LIMITE_LISTADO],
  );

  return rows.map(mapearSesion);
}
