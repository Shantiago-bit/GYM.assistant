import type { PoolClient } from 'pg';
import { LIMITE_LISTADO } from '@/lib/config/gym';
import { conTransaccion, pool } from '@/lib/db/conexion';
import { obtenerEjercicioBasico, type EjercicioBasico } from '@/lib/datos/ejercicios';
import { recomendarSobreUltimaSesion } from '@/lib/datos/recomendacion';
import type {
  DatosEntrenamiento,
  DatosSesion,
  ResultadoEntrenamiento,
  LogroMeta,
  Recomendacion,
  Serie,
  SerieKg,
  Sesion,
  SesionRegistrada,
} from '@/lib/datos/tipos';
import { kgAGramos } from '@/lib/formato';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { esFechaFutura, esFechaValida, hoyBogota } from '@/lib/reglas/fechas';
import { detectarLogro, estadoTrasSesion } from '@/lib/reglas/progresion';
import { validarSesion, type SerieEntrada } from '@/lib/reglas/sesion';
import { seriesEfectivas } from '@/lib/reglas/tecnicas';

const CAMPOS_SESION = `
  s.id, s.fecha, s.es_prueba,
  COALESCE(
    json_agg(
      json_build_object(
        'numero', x.numero, 'reps', x.reps, 'pesoGramos', x.peso_gramos, 'rir', x.rir,
        'tipoSerie', x.tipo_serie, 'extras', x.extras
      )
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
    rir: serie.rir ?? null,
    tipoSerie: serie.tipoSerie ?? 'normal',
    extras:
      serie.extras && serie.extras.length > 0
        ? serie.extras.map((extra) => ({
            reps: extra.reps,
            pesoGramos: extra.pesoKg === undefined ? null : kgAGramos(extra.pesoKg),
          }))
        : null,
  }));
}

// Las series de aproximación no deciden nada: se quitan antes de evaluar la sesión.
function pesosEfectivos(series: SerieEntrada[]): (number | null)[] {
  return seriesEfectivas(series).map((serie) => serie.pesoGramos ?? null);
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
      `INSERT INTO series (sesion_id, numero, reps, peso_gramos, rir, tipo_serie, extras)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        sesionId,
        indice + 1,
        serie.reps,
        serie.pesoGramos ?? null,
        serie.rir ?? null,
        serie.tipoSerie ?? 'normal',
        serie.extras && serie.extras.length > 0 ? JSON.stringify(serie.extras) : null,
      ],
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

export async function registrarPruebaInicial(
  usuarioId: string,
  id: string,
  seriesKg: SerieKg[],
): Promise<Sesion> {
  return conTransaccion(async (tx) => {
    const ejercicio = await obtenerEjercicioBasico(tx, usuarioId, id);

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
      const pesoInicial = Math.max(...pesosEfectivos(series).map((peso) => peso ?? 0));
      await tx.query('UPDATE ejercicios SET peso_ref_gramos = $1 WHERE id = $2 AND usuario_id = $3', [
        pesoInicial,
        id,
        usuarioId,
      ]);
    }

    return sesion;
  });
}

export async function registrarSesionEnTransaccion(
  tx: PoolClient,
  usuarioId: string,
  id: string,
  d: DatosSesion,
): Promise<Sesion> {
  const ejercicio = await obtenerEjercicioBasico(tx, usuarioId, id);

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
    pesosDeLaSesion: pesosEfectivos(series),
    metodo: ejercicio.metodo,
  });
  await tx.query(
    'UPDATE ejercicios SET peso_ref_gramos = $1, meta_reps = $2 WHERE id = $3 AND usuario_id = $4',
    [estado.pesoRefGramos, estado.metaReps, id, usuarioId],
  );

  return sesion;
}

export async function registrarSesion(
  usuarioId: string,
  id: string,
  d: DatosSesion,
): Promise<Sesion> {
  return conTransaccion((tx) => registrarSesionEnTransaccion(tx, usuarioId, id, d));
}

// El ejercicio y la recomendación deben leerse después de guardar la sesión.
function logroDe(ejercicio: EjercicioBasico, series: SerieKg[], recomendacion: Recomendacion): LogroMeta | null {
  return detectarLogro({
    nombre: ejercicio.nombre,
    tipo: ejercicio.tipo,
    rango: ejercicio.rango,
    pesoRefGramos: ejercicio.pesoRefGramos,
    series: aSeriesEnGramos(series),
    recomendacion,
    metodo: ejercicio.metodo,
  });
}

export async function registrarSesionConLogro(
  usuarioId: string,
  id: string,
  d: DatosSesion,
): Promise<SesionRegistrada> {
  return conTransaccion(async (tx) => {
    const sesion = await registrarSesionEnTransaccion(tx, usuarioId, id, d);
    const ejercicio = await obtenerEjercicioBasico(tx, usuarioId, id);
    const recomendacion = await recomendarSobreUltimaSesion(tx, ejercicio);

    return { ...sesion, logro: logroDe(ejercicio, d.series, recomendacion) };
  });
}

// Una sesión por ejercicio, en una sola transacción: un error no deja el entrenamiento a medias.
export async function registrarEntrenamiento(
  usuarioId: string,
  d: DatosEntrenamiento,
): Promise<ResultadoEntrenamiento[]> {
  await conTransaccion(async (tx) => {
    for (const { ejercicioId, series } of d.ejercicios) {
      await registrarSesionEnTransaccion(tx, usuarioId, ejercicioId, { fecha: d.fecha, series });
    }
  });

  const resultados: ResultadoEntrenamiento[] = [];

  for (const { ejercicioId, series } of d.ejercicios) {
    const ejercicio = await obtenerEjercicioBasico(pool, usuarioId, ejercicioId);
    const recomendacion = await recomendarSobreUltimaSesion(pool, ejercicio);
    resultados.push({
      ejercicioId,
      nombre: ejercicio.nombre,
      recomendacion,
      logro: logroDe(ejercicio, series, recomendacion),
    });
  }

  return resultados;
}

export async function listarSesiones(usuarioId: string, id: string): Promise<Sesion[]> {
  await obtenerEjercicioBasico(pool, usuarioId, id);

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

// Fechas con al menos una sesión de la cuenta (ejercicios archivados incluidos), para la racha de /gym.
export async function listarFechasConSesion(usuarioId: string): Promise<string[]> {
  const { rows } = await pool.query<{ fecha: string }>(
    `SELECT DISTINCT s.fecha::text AS fecha
     FROM sesiones s JOIN ejercicios e ON e.id = s.ejercicio_id
     WHERE e.usuario_id = $1
     ORDER BY 1`,
    [usuarioId],
  );
  return rows.map((fila) => fila.fecha);
}
