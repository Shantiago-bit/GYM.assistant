import type { PoolClient } from 'pg';
import { VIGENCIA_AUTORIZACION_DIAS, ZONA_HORARIA } from '@/lib/config/gym';
import { conTransaccion, consultar } from '@/lib/db/conexion';

// Solicitudes de autorización a tutores. Solo se guarda el hash del token. Cada reenvío crea una fila nueva
// (con su propio token) y deja sin efecto las anteriores; el plazo es siempre el mismo: VIGENCIA_AUTORIZACION_DIAS
// desde que se creó el perfil, así que reenviar no alarga la vida de una cuenta pendiente.

export interface SolicitudPendiente {
  correoTutor: string;
  venceDia: string; // fecha de Colombia, AAAA-MM-DD
  reenviosHoy: number;
}

export interface Autorizacion {
  usuarioId: string;
  correoTutor: string;
  venceDia: string;
  respondida: boolean;
  decision: 'aprobada' | 'rechazada' | null;
  vencida: boolean;
}

export type ResultadoRespuesta =
  | { estado: 'aprobada' | 'rechazada'; usuarioId: string }
  | { estado: 'invalido' | 'usado' | 'vencido' };

const VENCE_DIA = `(a.vence_en AT TIME ZONE '${ZONA_HORARIA}')::date::text`;
// Reenvíos de hoy (en Colombia): las filas de hoy menos la primera solicitud, si fue hoy.
const REENVIOS_HOY = `(SELECT COUNT(*)::int FROM autorizaciones_tutor r
   WHERE r.usuario_id = $1
     AND r.creado_en >= (date_trunc('day', now() AT TIME ZONE '${ZONA_HORARIA}') AT TIME ZONE '${ZONA_HORARIA}')
     AND r.creado_en > (SELECT MIN(creado_en) FROM autorizaciones_tutor WHERE usuario_id = $1))`;

// Crea una solicitud y deja sin efecto las anteriores que no tuvieron respuesta.
export async function crearSolicitud(
  usuarioId: string,
  correoTutor: string,
  tokenHash: string,
  tx?: PoolClient,
): Promise<{ venceDia: string }> {
  const ejecutar = async (cliente: PoolClient) => {
    await cliente.query(
      `UPDATE autorizaciones_tutor SET vence_en = LEAST(vence_en, now())
       WHERE usuario_id = $1 AND respondida_en IS NULL`,
      [usuarioId],
    );
    const { rows } = await cliente.query<{ vence_dia: string }>(
      `INSERT INTO autorizaciones_tutor AS a (usuario_id, correo_tutor, token_hash, vence_en)
       SELECT p.usuario_id, $2, $3, p.creado_en + make_interval(days => $4)
       FROM perfiles p WHERE p.usuario_id = $1
       RETURNING ${VENCE_DIA} AS vence_dia`,
      [usuarioId, correoTutor.trim().toLowerCase(), tokenHash, VIGENCIA_AUTORIZACION_DIAS],
    );
    if (!rows[0]) {
      throw new Error('La cuenta no tiene perfil.');
    }
    return { venceDia: rows[0].vence_dia };
  };
  return tx ? ejecutar(tx) : conTransaccion(ejecutar);
}

// Para la pantalla "Esperando autorización" y el reenvío: la última solicitud de una cuenta pendiente.
export async function obtenerSolicitudPendiente(usuarioId: string): Promise<SolicitudPendiente | null> {
  const filas = await consultar<{ correo_tutor: string; vence_dia: string; reenvios_hoy: number }>(
    `SELECT a.correo_tutor,
            ((p.creado_en + make_interval(days => $2)) AT TIME ZONE '${ZONA_HORARIA}')::date::text AS vence_dia,
            ${REENVIOS_HOY} AS reenvios_hoy
     FROM perfiles p
     JOIN autorizaciones_tutor a ON a.usuario_id = p.usuario_id
     WHERE p.usuario_id = $1 AND p.autorizacion = 'pendiente'
     ORDER BY a.creado_en DESC
     LIMIT 1`,
    [usuarioId, VIGENCIA_AUTORIZACION_DIAS],
  );
  const fila = filas[0];
  return fila ? { correoTutor: fila.correo_tutor, venceDia: fila.vence_dia, reenviosHoy: fila.reenvios_hoy } : null;
}

// ¿Sigue dentro del plazo? Pasado el plazo, la limpieza programada elimina la cuenta.
export async function solicitudEnPlazo(usuarioId: string): Promise<boolean> {
  const filas = await consultar<{ en_plazo: boolean }>(
    `SELECT p.creado_en + make_interval(days => $2) > now() AS en_plazo FROM perfiles p WHERE p.usuario_id = $1`,
    [usuarioId, VIGENCIA_AUTORIZACION_DIAS],
  );
  return filas[0]?.en_plazo === true;
}

// Lectura para la página /autorizar/[token]: no cambia nada.
export async function obtenerAutorizacionPorHash(tokenHash: string): Promise<Autorizacion | null> {
  const filas = await consultar<{
    usuario_id: string;
    correo_tutor: string;
    vence_dia: string;
    respondida: boolean;
    decision: 'aprobada' | 'rechazada' | null;
    vencida: boolean;
  }>(
    `SELECT a.usuario_id, a.correo_tutor, ${VENCE_DIA} AS vence_dia, a.respondida_en IS NOT NULL AS respondida,
            a.decision, a.vence_en <= now() AS vencida
     FROM autorizaciones_tutor a WHERE a.token_hash = $1`,
    [tokenHash],
  );
  const fila = filas[0];
  return fila
    ? {
        usuarioId: fila.usuario_id,
        correoTutor: fila.correo_tutor,
        venceDia: fila.vence_dia,
        respondida: fila.respondida,
        decision: fila.decision,
        vencida: fila.vencida,
      }
    : null;
}

// Registra la respuesta del tutor en una transacción: el token se usa una sola vez aunque lleguen dos
// respuestas a la vez (FOR UPDATE). Aprobar habilita el perfil; rechazar lo marca para borrar la cuenta.
export async function responderSolicitud(
  tokenHash: string,
  decision: 'aprobada' | 'rechazada',
): Promise<ResultadoRespuesta> {
  return conTransaccion(async (tx) => {
    const { rows } = await tx.query<{ id: string; usuario_id: string; respondida: boolean; vencida: boolean }>(
      `SELECT a.id, a.usuario_id, a.respondida_en IS NOT NULL AS respondida, a.vence_en <= now() AS vencida
       FROM autorizaciones_tutor a JOIN perfiles p ON p.usuario_id = a.usuario_id
       WHERE a.token_hash = $1 AND p.autorizacion = 'pendiente'
       FOR UPDATE OF a, p`,
      [tokenHash],
    );
    const fila = rows[0];
    if (!fila) {
      const usada = await tx.query('SELECT 1 FROM autorizaciones_tutor WHERE token_hash = $1', [tokenHash]);
      return { estado: usada.rowCount ? 'usado' : 'invalido' };
    }
    if (fila.respondida) return { estado: 'usado' };
    if (fila.vencida) return { estado: 'vencido' };

    await tx.query('UPDATE autorizaciones_tutor SET respondida_en = now(), decision = $2 WHERE id = $1', [
      fila.id,
      decision,
    ]);
    await tx.query('UPDATE perfiles SET autorizacion = $2, actualizado_en = now() WHERE usuario_id = $1', [
      fila.usuario_id,
      decision,
    ]);
    return { estado: decision, usuarioId: fila.usuario_id };
  });
}

// Cuentas que la limpieza programada elimina: rechazadas y pendientes fuera de plazo.
export async function listarCuentasParaLimpiar(): Promise<string[]> {
  const filas = await consultar<{ usuario_id: string }>(
    `SELECT usuario_id FROM perfiles
     WHERE autorizacion = 'rechazada'
        OR (autorizacion = 'pendiente' AND creado_en + make_interval(days => $1) <= now())`,
    [VIGENCIA_AUTORIZACION_DIAS],
  );
  return filas.map((fila) => fila.usuario_id);
}

// Para cortar el acceso a /api/gym: pendiente o rechazada.
export async function estaSinAutorizar(usuarioId: string): Promise<boolean> {
  const filas = await consultar<{ sin_autorizar: boolean }>(
    `SELECT autorizacion IN ('pendiente', 'rechazada') AS sin_autorizar FROM perfiles WHERE usuario_id = $1`,
    [usuarioId],
  );
  return filas[0]?.sin_autorizar === true;
}
