// Datos del panel de administración. Todas las estadísticas son consultas agregadas (COUNT, SUM y date_trunc en
// America/Bogota): nunca se traen filas de personas a Node. Lo que muestra el resumen se guarda 5 minutos en la
// caché de Next con la etiqueta 'admin' (las acciones del panel la invalidan con revalidateTag('admin')).
import { createClient } from '@supabase/supabase-js';
import { revalidateTag, unstable_cache } from 'next/cache';
import {
  ADMIN_CACHE_SEGUNDOS,
  ADMIN_META_ACTIVAS_POR_DEFECTO,
  ADMIN_TOP_EJERCICIOS,
  UMBRAL_ANONIMATO,
  ZONA_HORARIA,
} from '@/lib/config/gym';
import { consultar, conTransaccion } from '@/lib/db/conexion';
import type { FilaMensual, Pendientes } from '@/lib/reglas/admin';
import { mascaraCorreo } from '@/lib/reglas/correo';
import {
  agruparCorreos,
  completarDias,
  DIAS_GRAFICO_CORREOS,
  LARGO_ERROR_LISTA,
  recortarError,
  type DiaCorreos,
  type FilaConteoCorreos,
  type FiltrosCorreos,
  type PeriodoCorreos,
  type ResumenCorreos,
} from '@/lib/reglas/correosAdmin';
import {
  aplicarUmbralAnonimato,
  completarDiasSemana,
  completarHoras,
  LETRAS_BASE,
  LETRAS_CON_MARCA,
  promedioSeriesPorSesion,
  repartirEjercicios,
  sqlNombreNormalizado,
  type ConteoDia,
  type ConteoHora,
  type FilaTipoEstado,
  type PeriodoEntrenamiento,
  type RepartoEjercicios,
} from '@/lib/reglas/entrenamientoAdmin';
import {
  escaparComodines,
  esCorreo,
  MAXIMO_BUSQUEDA,
  POR_PAGINA,
  type EstadoPersona,
  type FilaCsvPersona,
  type FiltrosAuditoria,
  type FiltrosPersonas,
  type OrdenPersonas,
} from '@/lib/reglas/personasAdmin';
import { calcularRacha, type TramoDias } from '@/lib/reglas/racha';

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

export interface MetaDetallada {
  valor: number;
  // false si nadie la ha cambiado todavía: se usa ADMIN_META_ACTIVAS_POR_DEFECTO.
  guardada: boolean;
  actualizadoEn: string | null;
  // Apodo (o nombre) de quien la cambió por última vez; null si no hay meta guardada o esa cuenta ya no existe.
  actualizadoPor: string | null;
}

export async function obtenerMetaDetallada(): Promise<MetaDetallada> {
  const [fila] = await consultar<{ valor: number; actualizado_en: string; actualizado_por: string | null }>(
    `SELECT m.valor, m.actualizado_en::text AS actualizado_en, COALESCE(p.apodo, p.nombre) AS actualizado_por
       FROM metas_admin m
       LEFT JOIN perfiles p ON p.usuario_id = m.actualizado_por
      WHERE m.clave = 'personas_activas_mes'`,
  );
  if (!fila) return { valor: ADMIN_META_ACTIVAS_POR_DEFECTO, guardada: false, actualizadoEn: null, actualizadoPor: null };
  return { valor: fila.valor, guardada: true, actualizadoEn: fila.actualizado_en, actualizadoPor: fila.actualizado_por };
}

export interface CambioMetaHistorial {
  fecha: string;
  admin: string | null; // apodo o nombre; null si la cuenta ya no existe
  anterior: number | null;
  nuevo: number | null;
}

// Últimos cambios de la meta, del más reciente al más antiguo, leídos de la auditoría (no hay otra tabla de
// historial: cada cambio se audita en la misma transacción que lo guarda).
export async function historialMeta(limite = 10): Promise<CambioMetaHistorial[]> {
  const filas = await consultar<{ fecha: string; admin: string | null; anterior: number | null; nuevo: number | null }>(
    `SELECT a.creado_en::text AS fecha, COALESCE(p.apodo, p.nombre) AS admin,
            (a.detalle->>'anterior')::int AS anterior, (a.detalle->>'nuevo')::int AS nuevo
       FROM auditoria_admin a
       LEFT JOIN perfiles p ON p.usuario_id = a.admin_id
      WHERE a.accion = 'cambiar_meta'
      ORDER BY a.creado_en DESC, a.id DESC
      LIMIT $1`,
    [limite],
  );
  return filas;
}

export interface CambioMeta {
  anterior: number;
  nuevo: number;
  // false si el valor ya era ese: no se escribe nada ni se audita.
  cambiada: boolean;
}

// Guarda la meta y su auditoría ('cambiar_meta' con {anterior, nuevo}) en una sola transacción: no puede quedar
// una meta cambiada sin su registro. FOR UPDATE evita que dos cambios simultáneos auditen el mismo "anterior".
// El valor llega ya validado (esquemaMeta); el CHECK de la tabla lo vuelve a comprobar.
export async function cambiarMetaActivasMes(valor: number, adminId: string): Promise<CambioMeta> {
  const cambio = await conTransaccion(async (tx) => {
    const { rows } = await tx.query<{ valor: number }>(
      `SELECT valor FROM metas_admin WHERE clave = 'personas_activas_mes' FOR UPDATE`,
    );
    const anterior = rows[0]?.valor ?? ADMIN_META_ACTIVAS_POR_DEFECTO;
    if (rows[0] && anterior === valor) return { anterior, nuevo: valor, cambiada: false };

    await tx.query(
      `INSERT INTO metas_admin (clave, valor, actualizado_en, actualizado_por)
       VALUES ('personas_activas_mes', $1, now(), $2)
       ON CONFLICT (clave) DO UPDATE
         SET valor = EXCLUDED.valor, actualizado_en = EXCLUDED.actualizado_en, actualizado_por = EXCLUDED.actualizado_por`,
      [valor, adminId],
    );
    await tx.query(
      `INSERT INTO auditoria_admin (admin_id, accion, detalle) VALUES ($1, 'cambiar_meta', $2)`,
      [adminId, JSON.stringify({ meta: 'personas_activas_mes', anterior, nuevo: valor })],
    );
    return { anterior, nuevo: valor, cambiada: true };
  });
  // El resumen y el medidor de la meta están en la caché de 5 minutos: se recalculan con la meta nueva.
  if (cambio.cambiada) revalidateTag(ETIQUETA_CACHE_ADMIN);
  return cambio;
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

// =====================================================================================================
// Personas y auditoría (Parte 2 del panel). Las listas se paginan en la base (25 por página) y los conteos se
// agregan en SQL; la racha se calcula solo para las filas de la página. supabaseAdmin (clave de servicio) solo
// existe en este archivo: suspender y reactivar son las únicas operaciones que necesitan la API de Auth.
// =====================================================================================================

function clienteServicio() {
  return createClient(
    process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_URL ?? '',
    process.env.GYMLEAD_SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export interface FilaPersona {
  id: string;
  correoMascara: string;
  apodo: string | null;
  registro: string; // AAAA-MM-DD (Bogotá)
  estado: EstadoPersona;
  ultimaActividad: string | null;
  ejercicios: number;
  sesiones: number;
  racha: number;
  modoAvanzado: boolean;
  esAdmin: boolean;
}

interface RegistroPersona {
  id: string;
  email: string | null;
  apodo: string | null;
  registro: string;
  estado: EstadoPersona;
  ultima: string | null;
  ejercicios: number;
  sesiones: number;
  modo_avanzado: boolean;
  es_admin: boolean;
  total: number;
}

const BASE_PERSONAS = `
  WITH base AS (
    SELECT u.id, u.email, u.created_at,
           (u.created_at AT TIME ZONE '${ZONA_HORARIA}')::date AS registro_fecha,
           p.apodo, COALESCE(p.modo_avanzado, false) AS modo_avanzado,
           (a.usuario_id IS NOT NULL) AS es_admin,
           act.ultima, COALESCE(act.ejercicios, 0)::int AS ejercicios, COALESCE(act.sesiones, 0)::int AS sesiones,
           CASE WHEN u.banned_until IS NOT NULL AND u.banned_until > now() THEN 'suspendida'
                WHEN p.autorizacion IN ('pendiente', 'rechazada') THEN 'menor_pendiente'
                WHEN p.autorizacion = 'aprobada' THEN 'menor_autorizado'
                WHEN u.email_confirmed_at IS NULL THEN 'sin_confirmar'
                ELSE 'confirmada' END AS estado
      FROM auth.users u
      LEFT JOIN perfiles p ON p.usuario_id = u.id
      LEFT JOIN administradores a ON a.usuario_id = u.id
      LEFT JOIN LATERAL (
        SELECT count(DISTINCT e.id) AS ejercicios, count(s.id) AS sesiones, max(s.fecha) AS ultima
          FROM ejercicios e LEFT JOIN sesiones s ON s.ejercicio_id = e.id
         WHERE e.usuario_id = u.id
      ) act ON true
  )`;

const COLUMNA_ORDEN: Record<OrdenPersonas, string> = {
  registro: 'created_at',
  ultima: 'ultima',
  ejercicios: 'ejercicios',
  sesiones: 'sesiones',
  apodo: 'lower(apodo)',
};

function condicionesPersonas(filtros: FiltrosPersonas): { donde: string; valores: unknown[] } {
  const condiciones: string[] = [];
  const valores: unknown[] = [];
  const agregar = (condicion: string, valor: unknown) => {
    valores.push(valor);
    condiciones.push(condicion.replace('?', `$${valores.length}`));
  };
  if (filtros.estado) agregar('estado = ?', filtros.estado);
  if (filtros.desde) agregar('registro_fecha >= ?::date', filtros.desde);
  if (filtros.hasta) agregar('registro_fecha <= ?::date', filtros.hasta);
  if (filtros.q) {
    if (esCorreo(filtros.q)) agregar('lower(email) = lower(?)', filtros.q);
    else agregar(`apodo ILIKE ? || '%'`, escaparComodines(filtros.q));
  }
  return { donde: condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '', valores };
}

async function rachasDe(ids: string[], hoy: string): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const [fechas, dias] = await Promise.all([
    consultar<{ usuario_id: string; fecha: string }>(
      `SELECT DISTINCT e.usuario_id, s.fecha::text AS fecha
         FROM sesiones s JOIN ejercicios e ON e.id = s.ejercicio_id
        WHERE e.usuario_id = ANY($1::uuid[]) AND s.fecha >= $2::date - 400`,
      [ids, hoy],
    ),
    consultar<{ usuario_id: string; dias: number[]; vigente_desde: string }>(
      `SELECT usuario_id, dias, vigente_desde::text AS vigente_desde FROM dias_entrenamiento WHERE usuario_id = ANY($1::uuid[])`,
      [ids],
    ),
  ]);
  const rachas = new Map<string, number>();
  for (const id of ids) {
    const historial: TramoDias[] = dias.filter((fila) => fila.usuario_id === id).map((fila) => ({ dias: fila.dias, vigenteDesde: fila.vigente_desde }));
    const fechasDe = fechas.filter((fila) => fila.usuario_id === id).map((fila) => fila.fecha);
    rachas.set(id, fechasDe.length ? calcularRacha(fechasDe, hoy, historial).actual : 0);
  }
  return rachas;
}

const aFila = (fila: RegistroPersona, rachas: Map<string, number>): FilaPersona => ({
  id: fila.id,
  correoMascara: fila.email ? mascaraCorreo(fila.email) : '—',
  apodo: fila.apodo,
  registro: fila.registro,
  estado: fila.estado,
  ultimaActividad: fila.ultima,
  ejercicios: fila.ejercicios,
  sesiones: fila.sesiones,
  racha: rachas.get(fila.id) ?? 0,
  modoAvanzado: fila.modo_avanzado,
  esAdmin: fila.es_admin,
});

// Una página de la lista de personas, con el total para la paginación.
export async function listarPersonas(filtros: FiltrosPersonas, hoy: string, porPagina = POR_PAGINA): Promise<{ filas: FilaPersona[]; total: number }> {
  const { donde, valores } = condicionesPersonas(filtros);
  const orden = `${COLUMNA_ORDEN[filtros.orden]} ${filtros.dir === 'asc' ? 'ASC' : 'DESC'} NULLS LAST, created_at DESC`;
  const filas = await consultar<RegistroPersona>(
    `${BASE_PERSONAS}
     SELECT id, email, apodo, registro_fecha::text AS registro, estado, ultima::text AS ultima, ejercicios, sesiones,
            modo_avanzado, es_admin, count(*) OVER()::int AS total
       FROM base ${donde}
      ORDER BY ${orden}
      LIMIT ${Math.max(1, porPagina)} OFFSET ${(filtros.pagina - 1) * Math.max(1, porPagina)}`,
    valores,
  );
  const rachas = await rachasDe(filas.map((fila) => fila.id), hoy);
  return { filas: filas.map((fila) => aFila(fila, rachas)), total: filas[0]?.total ?? 0 };
}

// Para el CSV: todas las filas que coinciden con los filtros (hasta 5000), solo con columnas no personales.
export async function personasParaCsv(filtros: FiltrosPersonas, hoy: string): Promise<FilaCsvPersona[]> {
  const { filas } = await listarPersonas({ ...filtros, pagina: 1 }, hoy, 5000);
  return filas.map(({ estado, registro, ultimaActividad, ejercicios, sesiones, racha, modoAvanzado }) => ({
    estado,
    registro,
    ultimaActividad,
    ejercicios,
    sesiones,
    racha,
    modoAvanzado,
  }));
}

// Buscador de la barra superior: correo exacto o prefijo del apodo. Pide uno más del máximo para saber si hay más.
export async function buscarPersonas(q: string): Promise<{ resultados: Pick<FilaPersona, 'id' | 'correoMascara' | 'apodo' | 'estado'>[]; hayMas: boolean }> {
  const texto = q.trim();
  if (!texto) return { resultados: [], hayMas: false };
  const { donde, valores } = condicionesPersonas({ estado: null, desde: null, hasta: null, q: texto, orden: 'apodo', dir: 'asc', pagina: 1 });
  const filas = await consultar<Pick<RegistroPersona, 'id' | 'email' | 'apodo' | 'estado'>>(
    `${BASE_PERSONAS} SELECT id, email, apodo, estado FROM base ${donde} ORDER BY lower(apodo) NULLS LAST LIMIT ${MAXIMO_BUSQUEDA + 1}`,
    valores,
  );
  return {
    resultados: filas.slice(0, MAXIMO_BUSQUEDA).map((fila) => ({
      id: fila.id,
      correoMascara: fila.email ? mascaraCorreo(fila.email) : '—',
      apodo: fila.apodo,
      estado: fila.estado,
    })),
    hayMas: filas.length > MAXIMO_BUSQUEDA,
  };
}

export interface DetallePersona {
  id: string;
  correo: string;
  apodo: string | null;
  nombre: string | null;
  fechaNacimiento: string | null; // solo para calcular la edad: la página muestra la edad, no la fecha
  genero: string | null;
  registro: string;
  confirmada: string | null;
  estado: EstadoPersona;
  esAdmin: boolean;
  modoAvanzado: boolean;
  nivelAnimacion: string | null;
  autorizacion: string | null;
  solicitudTutor: { creada: string; vence: string; respondida: string | null; decision: string | null } | null;
  dias: number[];
  fechasSesiones: string[];
  racha: { actual: number; mejor: number };
  // Veces que una sesión superó el mayor peso anterior del mismo ejercicio (sin contar la primera sesión).
  records: number;
  ejerciciosActivos: number;
  ejerciciosArchivados: number;
  correos: { tipo: string; resultado: string; fecha: string }[];
  auditoria: { accion: string; fecha: string; admin: string | null; detalle: Record<string, unknown> }[];
}

export async function obtenerDetallePersona(id: string, hoy: string): Promise<DetallePersona | null> {
  const [cuenta] = await consultar<{
    id: string;
    email: string | null;
    apodo: string | null;
    nombre: string | null;
    fecha_nacimiento: string | null;
    genero: string | null;
    registro: string;
    confirmada: string | null;
    estado: EstadoPersona;
    es_admin: boolean;
    modo_avanzado: boolean;
    nivel_animacion: string | null;
    autorizacion: string | null;
  }>(
    `${BASE_PERSONAS}
     SELECT b.id, b.email, b.apodo, p.nombre, p.fecha_nacimiento::text AS fecha_nacimiento, p.genero,
            b.created_at::text AS registro, u.email_confirmed_at::text AS confirmada, b.estado, b.es_admin,
            b.modo_avanzado, p.nivel_animacion, p.autorizacion
       FROM base b JOIN auth.users u ON u.id = b.id LEFT JOIN perfiles p ON p.usuario_id = b.id
      WHERE b.id = $1`,
    [id],
  );
  if (!cuenta) return null;
  const [solicitudes, tramos, fechas, ejercicios, correos, auditoria, records] = await Promise.all([
    consultar<{ creada: string; vence: string; respondida: string | null; decision: string | null }>(
      `SELECT creado_en::text AS creada, vence_en::text AS vence, respondida_en::text AS respondida, decision
         FROM autorizaciones_tutor WHERE usuario_id = $1 ORDER BY creado_en DESC LIMIT 1`,
      [id],
    ),
    consultar<{ dias: number[]; vigente_desde: string }>(
      `SELECT dias, vigente_desde::text AS vigente_desde FROM dias_entrenamiento WHERE usuario_id = $1 ORDER BY vigente_desde`,
      [id],
    ),
    consultar<{ fecha: string }>(
      `SELECT DISTINCT s.fecha::text AS fecha FROM sesiones s JOIN ejercicios e ON e.id = s.ejercicio_id WHERE e.usuario_id = $1 ORDER BY 1`,
      [id],
    ),
    consultar<{ activos: number; archivados: number }>(
      `SELECT count(*) FILTER (WHERE NOT archivado)::int AS activos, count(*) FILTER (WHERE archivado)::int AS archivados
         FROM ejercicios WHERE usuario_id = $1`,
      [id],
    ),
    consultar<{ tipo: string; resultado: string; fecha: string }>(
      `SELECT tipo, resultado, creado_en::text AS fecha FROM registro_correos WHERE usuario_id = $1 ORDER BY creado_en DESC LIMIT 20`,
      [id],
    ),
    consultar<{ accion: string; fecha: string; admin: string | null; detalle: Record<string, unknown> }>(
      `SELECT a.accion, a.creado_en::text AS fecha, COALESCE(p.apodo, p.nombre) AS admin, a.detalle
         FROM auditoria_admin a LEFT JOIN perfiles p ON p.usuario_id = a.admin_id
        WHERE a.objetivo_usuario_id = $1 ORDER BY a.creado_en DESC LIMIT 30`,
      [id],
    ),
    consultar<{ records: number }>(
      `WITH maximos AS (
         SELECT s.ejercicio_id, s.fecha, s.created_at, max(x.peso_gramos) AS peso
           FROM sesiones s JOIN ejercicios e ON e.id = s.ejercicio_id JOIN series x ON x.sesion_id = s.id
          WHERE e.usuario_id = $1 AND COALESCE(x.tipo_serie, 'normal') <> 'aproximacion'
          GROUP BY s.id, s.ejercicio_id, s.fecha, s.created_at
       ), comparados AS (
         SELECT peso, max(peso) OVER (PARTITION BY ejercicio_id ORDER BY fecha, created_at
                                      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS anterior
           FROM maximos
       )
       SELECT count(*) FILTER (WHERE anterior IS NOT NULL AND peso > anterior)::int AS records FROM comparados`,
      [id],
    ),
  ]);
  const historial: TramoDias[] = tramos.map((fila) => ({ dias: fila.dias, vigenteDesde: fila.vigente_desde }));
  const fechasSesiones = fechas.map((fila) => fila.fecha);
  const racha = fechasSesiones.length ? calcularRacha(fechasSesiones, hoy, historial) : { actual: 0, mejor: 0 };
  const vigente = historial.filter((tramo) => tramo.vigenteDesde <= hoy).at(-1);
  return {
    id: cuenta.id,
    correo: cuenta.email ?? '',
    apodo: cuenta.apodo,
    nombre: cuenta.nombre,
    fechaNacimiento: cuenta.fecha_nacimiento,
    genero: cuenta.genero,
    registro: cuenta.registro,
    confirmada: cuenta.confirmada,
    estado: cuenta.estado,
    esAdmin: cuenta.es_admin,
    modoAvanzado: cuenta.modo_avanzado,
    nivelAnimacion: cuenta.nivel_animacion,
    autorizacion: cuenta.autorizacion,
    solicitudTutor: solicitudes[0] ?? null,
    dias: vigente?.dias ?? [],
    fechasSesiones,
    racha: { actual: racha.actual, mejor: racha.mejor },
    records: records[0]?.records ?? 0,
    ejerciciosActivos: ejercicios[0]?.activos ?? 0,
    ejerciciosArchivados: ejercicios[0]?.archivados ?? 0,
    correos,
    auditoria,
  };
}

// La cuenta sobre la que se quiere actuar: su correo (para reenviar o confirmar el borrado), si existe y si
// administra. null si no existe.
export async function cuentaObjetivo(id: string): Promise<{ correo: string; esAdmin: boolean; estado: EstadoPersona } | null> {
  const [fila] = await consultar<{ email: string | null; es_admin: boolean; estado: EstadoPersona }>(
    `${BASE_PERSONAS} SELECT email, es_admin, estado FROM base WHERE id = $1`,
    [id],
  );
  return fila ? { correo: fila.email ?? '', esAdmin: fila.es_admin, estado: fila.estado } : null;
}

// Suspender: ban de Supabase Auth (no puede iniciar sesión ni renovar la suya). Reactivar: lo quita.
export async function suspenderCuenta(id: string): Promise<void> {
  const { error } = await clienteServicio().auth.admin.updateUserById(id, { ban_duration: '876000h' });
  if (error) throw error;
}

export async function reactivarCuenta(id: string): Promise<void> {
  const { error } = await clienteServicio().auth.admin.updateUserById(id, { ban_duration: 'none' });
  if (error) throw error;
}

// ---------- Auditoría (solo lectura) ----------

export interface FilaAuditoria {
  id: string;
  fecha: string;
  admin: string | null;
  accion: string;
  objetivoId: string | null;
  objetivoMascara: string | null;
  detalle: Record<string, unknown>;
}

export async function listarAuditoria(filtros: FiltrosAuditoria, porPagina = POR_PAGINA): Promise<{ filas: FilaAuditoria[]; total: number }> {
  const condiciones: string[] = [];
  const valores: unknown[] = [];
  const agregar = (condicion: string, valor: unknown) => {
    valores.push(valor);
    condiciones.push(condicion.replace('?', `$${valores.length}`));
  };
  if (filtros.adminId) agregar('a.admin_id = ?', filtros.adminId);
  if (filtros.accion) agregar('a.accion = ?', filtros.accion);
  if (filtros.desde) agregar(`(a.creado_en AT TIME ZONE '${ZONA_HORARIA}')::date >= ?::date`, filtros.desde);
  if (filtros.hasta) agregar(`(a.creado_en AT TIME ZONE '${ZONA_HORARIA}')::date <= ?::date`, filtros.hasta);
  const filas = await consultar<{
    id: string;
    fecha: string;
    admin: string | null;
    accion: string;
    objetivo_id: string | null;
    objetivo_email: string | null;
    detalle: Record<string, unknown>;
    total: number;
  }>(
    `SELECT a.id::text AS id, a.creado_en::text AS fecha, COALESCE(p.apodo, p.nombre) AS admin, a.accion,
            a.objetivo_usuario_id AS objetivo_id, u.email AS objetivo_email, a.detalle, count(*) OVER()::int AS total
       FROM auditoria_admin a
       LEFT JOIN perfiles p ON p.usuario_id = a.admin_id
       LEFT JOIN auth.users u ON u.id = a.objetivo_usuario_id
       ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
      ORDER BY a.creado_en DESC, a.id DESC
      LIMIT ${porPagina} OFFSET ${(filtros.pagina - 1) * porPagina}`,
    valores,
  );
  return {
    filas: filas.map((fila) => ({
      id: fila.id,
      fecha: fila.fecha,
      admin: fila.admin,
      accion: fila.accion,
      objetivoId: fila.objetivo_id,
      objetivoMascara: fila.objetivo_email ? mascaraCorreo(fila.objetivo_email) : null,
      detalle: fila.detalle,
    })),
    total: filas[0]?.total ?? 0,
  };
}

// Para el filtro por administrador: quien administra hoy o aparece en la auditoría.
export async function administradoresDeAuditoria(): Promise<{ id: string; nombre: string }[]> {
  const filas = await consultar<{ id: string; nombre: string | null }>(
    `SELECT DISTINCT x.id, COALESCE(p.apodo, p.nombre) AS nombre
       FROM (SELECT usuario_id AS id FROM administradores UNION SELECT admin_id FROM auditoria_admin WHERE admin_id IS NOT NULL) x
       LEFT JOIN perfiles p ON p.usuario_id = x.id
      ORDER BY 2 NULLS LAST`,
  );
  return filas.map((fila) => ({ id: fila.id, nombre: fila.nombre ?? 'Sin apodo' }));
}

// =====================================================================================================
// Correos (Parte 3B del panel). registro_correos guarda 30 días; nunca se lee destinatario_hash ni el correo
// real: solo la máscara (d•••••7@gmail.com) que ya se guarda al registrar el envío.
// =====================================================================================================

// Inicio del día (expresión SQL de tipo date) en Bogotá, como timestamptz. Comparar creado_en contra este límite
// (y no convertir cada fila a la fecha de Bogotá) permite usar idx_registro_correos_creado.
const inicioDiaBogota = (expresionFecha: string) => `(${expresionFecha}::timestamp AT TIME ZONE '${ZONA_HORARIA}')`;

export interface DuracionProveedor {
  proveedor: string;
  envios: number;
  mediaMs: number;
}

export interface EstadisticasCorreos {
  periodo: PeriodoCorreos;
  // Totales del periodo por resultado, por tipo y por motivo de omisión, con la tasa de entrega.
  resumen: ResumenCorreos;
  // Últimos 30 días (DIAS_GRAFICO_CORREOS), con los días sin correos en 0, del más viejo a hoy.
  dias: DiaCorreos[];
  // Duración media del envío por proveedor en el periodo (solo intentos reales: sin los omitidos).
  duracionPorProveedor: DuracionProveedor[];
}

// `hoy` es la fecha de Bogotá. El periodo son los últimos `periodo` días contando hoy. Sin caché: la versión con
// caché está abajo.
export async function calcularEstadisticasCorreos(hoy: string, periodo: PeriodoCorreos): Promise<EstadisticasCorreos> {
  const desde = inicioDiaBogota('($1::date - ($2::int - 1))');
  const [conteos, dias, duraciones] = await Promise.all([
    consultar<FilaConteoCorreos>(
      `SELECT tipo, resultado, motivo_omision AS motivo, count(*)::int AS total
         FROM registro_correos
        WHERE creado_en >= ${desde}
        GROUP BY tipo, resultado, motivo_omision`,
      [hoy, periodo],
    ),
    consultar<DiaCorreos>(
      `SELECT (creado_en AT TIME ZONE '${ZONA_HORARIA}')::date::text AS dia,
              count(*) FILTER (WHERE resultado = 'aceptado')::int AS aceptados,
              count(*) FILTER (WHERE resultado IN ('rechazado', 'error'))::int AS fallidos,
              count(*) FILTER (WHERE resultado = 'omitido')::int AS omitidos
         FROM registro_correos
        WHERE creado_en >= ${desde}
        GROUP BY 1`,
      [hoy, DIAS_GRAFICO_CORREOS],
    ),
    consultar<{ proveedor: string; envios: number; media_ms: number }>(
      `SELECT proveedor, count(*)::int AS envios, round(avg(duracion_ms))::int AS media_ms
         FROM registro_correos
        WHERE creado_en >= ${desde}
          AND resultado <> 'omitido' AND proveedor IS NOT NULL AND duracion_ms IS NOT NULL
        GROUP BY proveedor
        ORDER BY proveedor`,
      [hoy, periodo],
    ),
  ]);
  return {
    periodo,
    resumen: agruparCorreos(conteos),
    dias: completarDias(dias, hoy, DIAS_GRAFICO_CORREOS),
    duracionPorProveedor: duraciones.map((fila) => ({ proveedor: fila.proveedor, envios: fila.envios, mediaMs: fila.media_ms })),
  };
}

export const estadisticasCorreos = unstable_cache(calcularEstadisticasCorreos, ['admin-correos'], {
  revalidate: ADMIN_CACHE_SEGUNDOS,
  tags: [ETIQUETA_CACHE_ADMIN],
});

// Reserva el envío de un correo de prueba para esta cuenta de administración: true si pasaron al menos `segundos`
// desde el anterior (y deja la hora de este), false si no. Un solo UPSERT atómico en limites_reenvio (la misma
// tabla de los reenvíos, sin migración): dos clics simultáneos no envían dos correos. La clave lleva el id de
// la cuenta, nunca el correo. La tarea Cron borra las filas de más de un día.
export async function reservarCorreoPruebaAdmin(adminId: string, segundos: number): Promise<boolean> {
  const filas = await consultar<{ reservado: number }>(
    `INSERT INTO limites_reenvio AS l (clave, ventana_desde, cantidad) VALUES ($1, now(), 1)
     ON CONFLICT (clave) DO UPDATE SET ventana_desde = now(), cantidad = 1
       WHERE l.ventana_desde <= now() - make_interval(secs => $2)
     RETURNING 1 AS reservado`,
    [`admin_correo_prueba:${adminId}`, segundos],
  );
  return filas.length > 0;
}

export interface FilaCorreo {
  id: string;
  fecha: string;
  tipo: string;
  destinatarioMascara: string;
  usuarioId: string | null;
  resultado: string;
  motivo: string | null;
  proveedor: string | null;
  error: string | null; // recortado a LARGO_ERROR_LISTA caracteres
  duracionMs: number | null;
}

// Lista paginada en la base, de la más reciente a la más antigua. Sin caché: quien revisa un error quiere verlo
// ya (como en la Auditoría). Los filtros llegan validados por leerFiltrosCorreos y van como parámetros.
export async function listarCorreos(filtros: FiltrosCorreos, porPagina = POR_PAGINA): Promise<{ filas: FilaCorreo[]; total: number }> {
  const condiciones: string[] = [];
  const valores: unknown[] = [];
  const agregar = (condicion: (parametro: string) => string, valor: unknown) => {
    valores.push(valor);
    condiciones.push(condicion(`$${valores.length}`));
  };
  if (filtros.tipo) agregar((p) => `c.tipo = ${p}`, filtros.tipo);
  if (filtros.resultado) agregar((p) => `c.resultado = ${p}`, filtros.resultado);
  if (filtros.proveedor) agregar((p) => `c.proveedor = ${p}`, filtros.proveedor);
  if (filtros.desde) agregar((p) => `c.creado_en >= ${inicioDiaBogota(`${p}::date`)}`, filtros.desde);
  if (filtros.hasta) agregar((p) => `c.creado_en < ${inicioDiaBogota(`(${p}::date + 1)`)}`, filtros.hasta);

  const filas = await consultar<{
    id: string;
    fecha: string;
    tipo: string;
    destinatario_mascara: string;
    usuario_id: string | null;
    resultado: string;
    motivo: string | null;
    proveedor: string | null;
    error: string | null;
    duracion_ms: number | null;
    total: number;
  }>(
    `SELECT c.id::text AS id, c.creado_en::text AS fecha, c.tipo, c.destinatario_mascara, c.usuario_id,
            c.resultado, c.motivo_omision AS motivo, c.proveedor, left(c.error, ${LARGO_ERROR_LISTA + 1}) AS error,
            c.duracion_ms, count(*) OVER()::int AS total
       FROM registro_correos c
       ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
      ORDER BY c.creado_en DESC, c.id DESC
      LIMIT ${porPagina} OFFSET ${(filtros.pagina - 1) * porPagina}`,
    valores,
  );
  return {
    filas: filas.map((fila) => ({
      id: fila.id,
      fecha: fila.fecha,
      tipo: fila.tipo,
      destinatarioMascara: fila.destinatario_mascara,
      usuarioId: fila.usuario_id,
      resultado: fila.resultado,
      motivo: fila.motivo,
      proveedor: fila.proveedor,
      error: recortarError(fila.error),
      duracionMs: fila.duracion_ms,
    })),
    total: filas[0]?.total ?? 0,
  };
}

// =====================================================================================================
// Entrenamiento (Parte 3C del panel). Solo cifras agregadas sobre todas las cuentas. Un nombre de ejercicio
// (normalizado) solo sale de la base si lo usan al menos UMBRAL_ANONIMATO cuentas distintas (HAVING en SQL).
// =====================================================================================================

export interface EjercicioPopular {
  nombre: string; // normalizado (minúsculas, sin tildes)
  cuentas: number;
  sesiones: number;
}

export interface EstadisticasEntrenamiento {
  periodo: PeriodoEntrenamiento;
  // Ranking del periodo por cuentas distintas y luego por sesiones; ya filtrado por el umbral de anonimato.
  populares: EjercicioPopular[];
  // Ejercicios que existen hoy en todas las cuentas (no depende del periodo).
  reparto: RepartoEjercicios;
  // Sesiones del periodo por día de la semana (1 = lunes) y por hora de registro en Bogotá (sesiones.created_at:
  // cuándo se guardó la sesión, no necesariamente cuándo se entrenó).
  porDiaSemana: ConteoDia[];
  porHora: ConteoHora[];
  sesiones: number;
  series: number;
  promedioSeries: number;
}

// `hoy` es la fecha de Bogotá; el periodo son los últimos `periodo` días contando hoy. sesiones.fecha ya está en
// Bogotá, así que el filtro por fecha usa idx_sesiones_fecha directamente. Sin caché: la versión con caché está abajo.
export async function calcularEstadisticasEntrenamiento(hoy: string, periodo: PeriodoEntrenamiento): Promise<EstadisticasEntrenamiento> {
  const enPeriodo = `s.fecha >= $1::date - ($2::int - 1)`;
  const [populares, tiposEstados, dias, horas, [totales]] = await Promise.all([
    consultar<EjercicioPopular>(
      `SELECT ${sqlNombreNormalizado('e.nombre', '$3', '$4')} AS nombre,
              count(DISTINCT e.usuario_id)::int AS cuentas, count(*)::int AS sesiones
         FROM sesiones s
         JOIN ejercicios e ON e.id = s.ejercicio_id
        WHERE ${enPeriodo}
        GROUP BY 1
       HAVING count(DISTINCT e.usuario_id) >= $5
        ORDER BY cuentas DESC, sesiones DESC, nombre
        LIMIT $6`,
      [hoy, periodo, LETRAS_CON_MARCA, LETRAS_BASE, UMBRAL_ANONIMATO, ADMIN_TOP_EJERCICIOS],
    ),
    consultar<FilaTipoEstado>(
      `SELECT tipo, archivado, count(*)::int AS ejercicios FROM ejercicios GROUP BY tipo, archivado`,
    ),
    consultar<ConteoDia>(
      `SELECT extract(isodow FROM s.fecha)::int AS dia, count(*)::int AS sesiones
         FROM sesiones s
        WHERE ${enPeriodo}
        GROUP BY 1`,
      [hoy, periodo],
    ),
    consultar<ConteoHora>(
      `SELECT extract(hour FROM s.created_at AT TIME ZONE '${ZONA_HORARIA}')::int AS hora, count(*)::int AS sesiones
         FROM sesiones s
        WHERE ${enPeriodo}
        GROUP BY 1`,
      [hoy, periodo],
    ),
    consultar<{ sesiones: number; series: number }>(
      `SELECT count(DISTINCT s.id)::int AS sesiones, count(x.id)::int AS series
         FROM sesiones s
         LEFT JOIN series x ON x.sesion_id = s.id
        WHERE ${enPeriodo}`,
      [hoy, periodo],
    ),
  ]);
  const sesiones = totales?.sesiones ?? 0;
  const series = totales?.series ?? 0;
  return {
    periodo,
    populares: aplicarUmbralAnonimato(populares),
    reparto: repartirEjercicios(tiposEstados),
    porDiaSemana: completarDiasSemana(dias),
    porHora: completarHoras(horas),
    sesiones,
    series,
    promedioSeries: promedioSeriesPorSesion(series, sesiones),
  };
}

export const estadisticasEntrenamiento = unstable_cache(calcularEstadisticasEntrenamiento, ['admin-entrenamiento'], {
  revalidate: ADMIN_CACHE_SEGUNDOS,
  tags: [ETIQUETA_CACHE_ADMIN],
});
