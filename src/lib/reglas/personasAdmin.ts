// Reglas puras del panel de administración: Personas y Auditoría (con pruebas). Nada aquí consulta la base.
import { restarDias } from '@/lib/reglas/fechas';

export const POR_PAGINA = 25;
export const MAXIMO_BUSQUEDA = 8; // resultados del buscador de la barra superior (con más, enlace a la lista)

export const ESTADOS_PERSONA = ['confirmada', 'sin_confirmar', 'menor_pendiente', 'menor_autorizado', 'suspendida'] as const;
export type EstadoPersona = (typeof ESTADOS_PERSONA)[number];
export const TEXTO_ESTADO: Record<EstadoPersona, string> = {
  confirmada: 'Confirmada',
  sin_confirmar: 'Sin confirmar',
  menor_pendiente: 'Menor pendiente',
  menor_autorizado: 'Menor autorizado',
  suspendida: 'Suspendida',
};

export const ORDENES = ['registro', 'ultima', 'ejercicios', 'sesiones', 'apodo'] as const;
export type OrdenPersonas = (typeof ORDENES)[number];

export interface FiltrosPersonas {
  estado: EstadoPersona | null;
  desde: string | null; // fecha de registro (AAAA-MM-DD, Bogotá)
  hasta: string | null;
  q: string | null; // correo exacto o prefijo del apodo
  orden: OrdenPersonas;
  dir: 'asc' | 'desc';
  pagina: number;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const uno = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor)?.trim() || null;

// Lee los filtros de la URL (searchParams) y descarta lo que no sea válido: la vista se puede compartir o recargar.
export function leerFiltrosPersonas(parametros: Record<string, string | string[] | undefined>): FiltrosPersonas {
  const estado = uno(parametros.estado);
  const desde = uno(parametros.desde);
  const hasta = uno(parametros.hasta);
  const orden = uno(parametros.orden);
  const pagina = Number.parseInt(uno(parametros.pagina) ?? '1', 10);
  const q = uno(parametros.q);
  return {
    estado: (ESTADOS_PERSONA as readonly string[]).includes(estado ?? '') ? (estado as EstadoPersona) : null,
    desde: desde && FECHA.test(desde) ? desde : null,
    hasta: hasta && FECHA.test(hasta) ? hasta : null,
    q: q ? q.slice(0, 120) : null,
    orden: (ORDENES as readonly string[]).includes(orden ?? '') ? (orden as OrdenPersonas) : 'registro',
    dir: uno(parametros.dir) === 'asc' ? 'asc' : 'desc',
    pagina: Number.isInteger(pagina) && pagina >= 1 ? Math.min(pagina, 10_000) : 1,
  };
}

// La consulta (?estado=…&orden=…) de unos filtros, con cambios (para los enlaces de orden y de páginas).
export function consultaPersonas(filtros: FiltrosPersonas, cambios: Partial<FiltrosPersonas> = {}): string {
  const f = { ...filtros, ...cambios };
  const parametros = new URLSearchParams();
  if (f.estado) parametros.set('estado', f.estado);
  if (f.desde) parametros.set('desde', f.desde);
  if (f.hasta) parametros.set('hasta', f.hasta);
  if (f.q) parametros.set('q', f.q);
  if (f.orden !== 'registro') parametros.set('orden', f.orden);
  if (f.dir !== 'desc') parametros.set('dir', f.dir);
  if (f.pagina > 1) parametros.set('pagina', String(f.pagina));
  const texto = parametros.toString();
  return texto ? `?${texto}` : '';
}

// Para la búsqueda por prefijo del apodo con ILIKE: los comodines de quien escribe se buscan tal cual.
export function escaparComodines(texto: string): string {
  return texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
}

export const esCorreo = (texto: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto);

// ---------- CSV ----------

export interface FilaCsvPersona {
  estado: EstadoPersona;
  registro: string; // AAAA-MM-DD
  ultimaActividad: string | null;
  ejercicios: number;
  sesiones: number;
  racha: number;
  modoAvanzado: boolean;
}

// Solo columnas no personales: nada de correos, nombres, apodos ni ids.
export function csvPersonas(filas: FilaCsvPersona[]): string {
  const encabezado = 'estado,fecha_registro,ultima_actividad,ejercicios,sesiones,racha_actual,modo';
  const lineas = filas.map((fila) =>
    [
      fila.estado,
      fila.registro,
      fila.ultimaActividad ?? '',
      fila.ejercicios,
      fila.sesiones,
      fila.racha,
      fila.modoAvanzado ? 'avanzado' : 'sencillo',
    ].join(','),
  );
  return `${[encabezado, ...lineas].join('\n')}\n`;
}

// ---------- Acciones ----------

export const ACCIONES_PERSONA = ['reenviar_confirmacion', 'reenviar_tutor', 'suspender', 'reactivar', 'eliminar'] as const;
export type AccionPersona = (typeof ACCIONES_PERSONA)[number];

// Nadie actúa sobre su propia cuenta ni sobre otra cuenta de administración desde el panel (eso solo con los
// scripts). Devuelve el motivo del rechazo o null si se puede.
export function motivoRechazo(d: { adminId: string; objetivoId: string; objetivoEsAdmin: boolean }): string | null {
  if (d.adminId === d.objetivoId) return 'No puedes hacer esta acción sobre tu propia cuenta.';
  if (d.objetivoEsAdmin) return 'Las cuentas de administración solo se gestionan con los scripts (npm run admin:*).';
  return null;
}

// Para eliminar hay que escribir el correo completo de la cuenta (sin distinguir mayúsculas ni espacios).
export function confirmacionValida(escrito: string | undefined, correo: string): boolean {
  return Boolean(escrito) && escrito!.trim().toLowerCase() === correo.trim().toLowerCase();
}

// ---------- Auditoría ----------

export const TEXTO_ACCION: Record<string, string> = {
  ver_usuario: 'Abrió el detalle de una persona',
  suspender: 'Suspendió una cuenta',
  reactivar: 'Reactivó una cuenta',
  eliminar_cuenta: 'Eliminó una cuenta y sus datos',
  reenviar_confirmacion: 'Reenvió el enlace de confirmación',
  reenviar_tutor: 'Reenvió el correo al tutor',
  exportar_csv: 'Exportó un CSV',
  asignar_admin: 'Dio acceso de administración (script)',
  quitar_admin: 'Quitó el acceso de administración (script)',
  enviar_correo_prueba: 'Envió un correo de prueba',
  cambiar_meta: 'Cambió una meta del panel',
};

// "reporte: personas · filas: 25": el detalle JSONB resumido en una línea.
export function resumirDetalle(detalle: Record<string, unknown> | null): string {
  if (!detalle) return '';
  return Object.entries(detalle)
    .filter(([, valor]) => valor !== null && valor !== undefined && valor !== '')
    .map(([clave, valor]) => `${clave.replace(/_/g, ' ')}: ${String(valor)}`)
    .join(' · ');
}

export interface FiltrosAuditoria {
  adminId: string | null;
  accion: string | null;
  desde: string | null;
  hasta: string | null;
  pagina: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// El id de una cuenta en la URL: si no es un UUID, la ruta responde 404 sin consultar la base.
export const esIdValido = (id: string) => UUID.test(id);

export function leerFiltrosAuditoria(parametros: Record<string, string | string[] | undefined>): FiltrosAuditoria {
  const adminId = uno(parametros.admin);
  const accion = uno(parametros.accion);
  const desde = uno(parametros.desde);
  const hasta = uno(parametros.hasta);
  const pagina = Number.parseInt(uno(parametros.pagina) ?? '1', 10);
  return {
    adminId: adminId && UUID.test(adminId) ? adminId : null,
    accion: accion && accion in TEXTO_ACCION ? accion : null,
    desde: desde && FECHA.test(desde) ? desde : null,
    hasta: hasta && FECHA.test(hasta) ? hasta : null,
    pagina: Number.isInteger(pagina) && pagina >= 1 ? Math.min(pagina, 10_000) : 1,
  };
}

export function consultaAuditoria(filtros: FiltrosAuditoria, cambios: Partial<FiltrosAuditoria> = {}): string {
  const f = { ...filtros, ...cambios };
  const parametros = new URLSearchParams();
  if (f.adminId) parametros.set('admin', f.adminId);
  if (f.accion) parametros.set('accion', f.accion);
  if (f.desde) parametros.set('desde', f.desde);
  if (f.hasta) parametros.set('hasta', f.hasta);
  if (f.pagina > 1) parametros.set('pagina', String(f.pagina));
  const texto = parametros.toString();
  return texto ? `?${texto}` : '';
}

// ---------- Actividad ----------

// Sesiones por semana (lunes a domingo) de las últimas `semanas`, de la más antigua a la actual.
export function sesionesPorSemana(fechas: string[], hoy: string, semanas = 12): { lunes: string; sesiones: number }[] {
  const diaIso = (fecha: string) => ((new Date(`${fecha}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
  const lunesActual = restarDias(hoy, diaIso(hoy) - 1);
  const resultado = Array.from({ length: semanas }, (_, i) => ({ lunes: restarDias(lunesActual, 7 * (semanas - 1 - i)), sesiones: 0 }));
  for (const fecha of fechas) {
    const lunes = restarDias(fecha, diaIso(fecha) - 1);
    const semana = resultado.find((fila) => fila.lunes === lunes);
    if (semana) semana.sesiones += 1;
  }
  return resultado;
}

export function edadDesde(fechaNacimiento: string, hoy: string): number {
  const [a, m, d] = fechaNacimiento.split('-').map(Number) as [number, number, number];
  const [ha, hm, hd] = hoy.split('-').map(Number) as [number, number, number];
  return ha - a - (hm < m || (hm === m && hd < d) ? 1 : 0);
}

// ---------- Fechas ----------

// Un timestamptz de Postgres como texto ("2026-11-24 15:04:05.123+00") a Date: no todos los motores aceptan ese
// formato tal cual.
export function leerMarcaDeTiempo(texto: string): Date {
  const iso = texto.trim().replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  return new Date(iso);
}

const FECHA_HORA_BOGOTA = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' });

export function fechaHoraBogota(texto: string | null): string {
  if (!texto) return '—';
  const fecha = leerMarcaDeTiempo(texto);
  return Number.isNaN(fecha.getTime()) ? '—' : FECHA_HORA_BOGOTA.format(fecha);
}
