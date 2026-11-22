// Datos del panel de administración. Todas las estadísticas son consultas agregadas (COUNT, SUM y date_trunc en
// America/Bogota): nunca se traen filas de personas a Node. Lo que muestra el resumen se guarda 5 minutos en la
// caché de Next con la etiqueta 'admin' (las acciones del panel la invalidan con revalidateTag('admin')).
import { unstable_cache } from 'next/cache';
import { ADMIN_CACHE_SEGUNDOS, ADMIN_META_ACTIVAS_POR_DEFECTO, ZONA_HORARIA } from '@/lib/config/gym';
import { consultar } from '@/lib/db/conexion';
import type { FilaMensual, Pendientes } from '@/lib/reglas/admin';

export const ETIQUETA_CACHE_ADMIN = 'admin';

export type RolAdmin = 'admin' | 'lectura';

export type AccionAuditoria =
  | 'ver_usuario'
  | 'suspender'
  | 'reactivar'
  | 'eliminar_cuenta'
  | 'reenviar_confirmacion'
  | 'reenviar_tutor'
  | 'exportar_csv'
  | 'asignar_admin'
  | 'quitar_admin'
  | 'enviar_correo_prueba'
  | 'cambiar_meta';

// ---------- Acceso ----------

export interface Administrador {
  rol: RolAdmin;
  suspendido: boolean;
}

// Rol de la cuenta en administradores y si está suspendida (ban de Supabase Auth). null si no administra.
export async function obtenerAdministrador(usuarioId: string): Promise<Administrador | null> {
  const [fila] = await consultar<{ rol: RolAdmin; suspendido: boolean }>(
    `SELECT a.rol, (u.banned_until IS NOT NULL AND u.banned_until > now()) AS suspendido
       FROM administradores a
       JOIN auth.users u ON u.id = a.usuario_id
      WHERE a.usuario_id = $1`,
    [usuarioId],
  );
  return fila ? { rol: fila.rol, suspendido: fila.suspendido } : null;
}

// ---------- Auditoría (solo inserción) ----------

// detalle: datos técnicos de la acción (por ejemplo, el formato exportado). Nunca correos, nombres ni fechas
// de nacimiento: la tabla los rechaza solo por convención, así que cada llamada se revisa en las pruebas.
export async function registrarAuditoria(registro: {
  adminId: string | null;
  accion: AccionAuditoria;
  objetivoUsuarioId?: string | null;
  detalle?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  await consultar(
    `INSERT INTO auditoria_admin (admin_id, accion, objetivo_usuario_id, detalle) VALUES ($1, $2, $3, $4)`,
    [registro.adminId, registro.accion, registro.objetivoUsuarioId ?? null, JSON.stringify(registro.detalle ?? {})],
  );
}

// Retención: la tarea Cron borra lo que tenga más de `dias` días (la tabla rechaza borrar algo más nuevo).
export async function borrarAuditoriaAntigua(dias: number): Promise<number> {
  const filas = await consultar<{ id: string }>(
    `DELETE FROM auditoria_admin WHERE creado_en < now() - make_interval(days => $1) RETURNING id`,
    [dias],
  );
  return filas.length;
}

// ---------- Metas ----------

export async function obtenerMetaActivasMes(): Promise<number> {
  const [fila] = await consultar<{ valor: number }>(`SELECT valor FROM metas_admin WHERE clave = 'personas_activas_mes'`);
  return fila?.valor ?? ADMIN_META_ACTIVAS_POR_DEFECTO;
}

// ---------- Estadísticas del resumen ----------

export interface EstadisticasResumen {
  // Últimos 12 meses (del más viejo al actual), solo los meses con algún dato; la regla completa los demás.
  meses: FilaMensual[];
  totalCuentas: number;
  activasHoy: number;
  // Personas distintas con al menos una sesión en los últimos 3, 6 y 12 meses (no es la suma de los meses).
  activasPeriodo: Record<3 | 6 | 12, number>;
  pendientes: Pendientes;
}

// `hoy` es la fecha de Bogotá ('YYYY-MM-DD'). Las fechas de sesiones y chat_uso ya están en hora de Bogotá; la
// creación de las cuentas (timestamptz) se pasa a Bogotá antes de agrupar por mes.
// Sin caché: la usan scripts/probar-flujo.ts (fuera de Next no hay caché) y la versión con caché de abajo.
export async function calcularEstadisticasResumen(hoy: string): Promise<EstadisticasResumen> {
  const [meses, [totales], [pendientes]] = await Promise.all([
    consultar<FilaMensual>(
      `WITH limites AS (
         SELECT date_trunc('month', $1::date::timestamp) - interval '11 months' AS desde
       ),
       registros AS (
         SELECT to_char(date_trunc('month', u.created_at AT TIME ZONE $2), 'YYYY-MM') AS mes, count(*)::int AS n
           FROM auth.users u, limites l
          WHERE u.created_at >= l.desde AT TIME ZONE $2
          GROUP BY 1
       ),
       actividad AS (
         SELECT to_char(date_trunc('month', s.fecha::timestamp), 'YYYY-MM') AS mes,
                count(*)::int AS sesiones,
                count(DISTINCT e.usuario_id)::int AS activas
           FROM sesiones s
           JOIN ejercicios e ON e.id = s.ejercicio_id, limites l
          WHERE s.fecha >= l.desde::date
          GROUP BY 1
       ),
       detalle AS (
         SELECT to_char(date_trunc('month', s.fecha::timestamp), 'YYYY-MM') AS mes, count(*)::int AS n
           FROM series se
           JOIN sesiones s ON s.id = se.sesion_id, limites l
          WHERE s.fecha >= l.desde::date
          GROUP BY 1
       ),
       chat AS (
         SELECT to_char(date_trunc('month', c.fecha::timestamp), 'YYYY-MM') AS mes, sum(c.mensajes)::int AS n
           FROM chat_uso c, limites l
          WHERE c.fecha >= l.desde::date
          GROUP BY 1
       ),
       meses AS (
         SELECT mes FROM registros UNION SELECT mes FROM actividad UNION SELECT mes FROM chat
       )
       SELECT m.mes,
              coalesce(r.n, 0) AS registros,
              coalesce(a.activas, 0) AS activas,
              coalesce(a.sesiones, 0) AS sesiones,
              coalesce(d.n, 0) AS series,
              coalesce(c.n, 0) AS mensajes
         FROM meses m
         LEFT JOIN registros r ON r.mes = m.mes
         LEFT JOIN actividad a ON a.mes = m.mes
         LEFT JOIN detalle d ON d.mes = m.mes
         LEFT JOIN chat c ON c.mes = m.mes
        ORDER BY m.mes`,
      [hoy, ZONA_HORARIA],
    ),
    consultar<{ total_cuentas: number; activas_hoy: number; activas_3: number; activas_6: number; activas_12: number }>(
      `SELECT (SELECT count(*)::int FROM auth.users) AS total_cuentas,
              (count(DISTINCT e.usuario_id) FILTER (WHERE s.fecha = $1::date))::int AS activas_hoy,
              (count(DISTINCT e.usuario_id) FILTER (
                WHERE s.fecha >= (date_trunc('month', $1::date::timestamp) - interval '2 months')::date))::int AS activas_3,
              (count(DISTINCT e.usuario_id) FILTER (
                WHERE s.fecha >= (date_trunc('month', $1::date::timestamp) - interval '5 months')::date))::int AS activas_6,
              count(DISTINCT e.usuario_id)::int AS activas_12
         FROM sesiones s
         JOIN ejercicios e ON e.id = s.ejercicio_id
        WHERE s.fecha >= (date_trunc('month', $1::date::timestamp) - interval '11 months')::date`,
      [hoy],
    ),
    consultar<{ correos_error: number; tutores_por_vencer: number; sin_confirmar_48h: number }>(
      `SELECT (SELECT count(*)::int FROM registro_correos
                WHERE resultado = 'error' AND creado_en > now() - interval '24 hours') AS correos_error,
              (SELECT count(*)::int FROM autorizaciones_tutor
                WHERE respondida_en IS NULL AND vence_en > now() AND vence_en <= now() + interval '48 hours') AS tutores_por_vencer,
              (SELECT count(*)::int FROM auth.users
                WHERE email_confirmed_at IS NULL AND created_at < now() - interval '48 hours') AS sin_confirmar_48h`,
    ),
  ]);

  return {
    meses,
    totalCuentas: totales?.total_cuentas ?? 0,
    activasHoy: totales?.activas_hoy ?? 0,
    activasPeriodo: { 3: totales?.activas_3 ?? 0, 6: totales?.activas_6 ?? 0, 12: totales?.activas_12 ?? 0 },
    pendientes: {
      correosConError24h: pendientes?.correos_error ?? 0,
      tutoresPorVencer48h: pendientes?.tutores_por_vencer ?? 0,
      sinConfirmarMas48h: pendientes?.sin_confirmar_48h ?? 0,
    },
  };
}

export const obtenerEstadisticasResumen = unstable_cache(calcularEstadisticasResumen, ['admin-resumen'], {
  revalidate: ADMIN_CACHE_SEGUNDOS,
  tags: [ETIQUETA_CACHE_ADMIN],
});

// ---------- Contadores del menú ----------

export interface ContadoresMenu {
  // Cuentas sin confirmar más menores esperando la autorización de su tutor.
  personasPendientes: number;
  correosConError24h: number;
  activasMes: number;
  totalCuentas: number;
}

export async function calcularContadoresMenu(hoy: string): Promise<ContadoresMenu> {
  // Una cuenta de menor pendiente también está sin confirmar (se confirma cuando el tutor autoriza): se cuenta
  // una sola vez.
  const [fila] = await consultar<{ pendientes: number; correos: number; activas: number; total: number }>(
    `SELECT (SELECT count(*)::int FROM auth.users u LEFT JOIN perfiles p ON p.usuario_id = u.id
              WHERE u.email_confirmed_at IS NULL OR p.autorizacion = 'pendiente') AS pendientes,
            (SELECT count(*)::int FROM registro_correos
              WHERE resultado = 'error' AND creado_en > now() - interval '24 hours') AS correos,
            (SELECT count(DISTINCT e.usuario_id)::int
               FROM sesiones s JOIN ejercicios e ON e.id = s.ejercicio_id
              WHERE s.fecha >= date_trunc('month', $1::date::timestamp)::date) AS activas,
            (SELECT count(*)::int FROM auth.users) AS total`,
    [hoy],
  );
  return {
    personasPendientes: fila?.pendientes ?? 0,
    correosConError24h: fila?.correos ?? 0,
    activasMes: fila?.activas ?? 0,
    totalCuentas: fila?.total ?? 0,
  };
}

export const obtenerContadoresMenu = unstable_cache(calcularContadoresMenu, ['admin-contadores'], {
  revalidate: ADMIN_CACHE_SEGUNDOS,
  tags: [ETIQUETA_CACHE_ADMIN],
});
