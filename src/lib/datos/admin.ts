// Datos del panel de administración. Todas las estadísticas son consultas agregadas (COUNT, SUM y date_trunc en
// America/Bogota): nunca se traen filas de personas a Node. Lo que muestra el resumen se guarda 5 minutos en la
// caché de Next con la etiqueta 'admin' (las acciones del panel la invalidan con revalidateTag('admin')).
import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { ADMIN_CACHE_SEGUNDOS, ADMIN_META_ACTIVAS_POR_DEFECTO, ZONA_HORARIA } from '@/lib/config/gym';
import { consultar } from '@/lib/db/conexion';
import type { FilaMensual, Pendientes } from '@/lib/reglas/admin';
import { mascaraCorreo } from '@/lib/reglas/correo';
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
