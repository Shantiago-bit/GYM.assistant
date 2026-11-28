// Reglas de la sección Correos del panel de administración: textos en palabras, tasa de entrega, agrupaciones
// sobre cifras ya agregadas en SQL y lectura de los filtros de la URL. Funciones puras (el "hoy" llega por
// parámetro). Pruebas en tests/reglas/correosAdmin.test.ts.
import type { MotivoOmision, ResultadoEnvio, TipoCorreo } from '@/lib/reglas/correo';

export type ProveedorCorreo = 'gmail' | 'resend';

// Los mismos valores de los CHECK de registro_correos (migración 20261115000000_registro_correos.sql).
export const TIPOS_CORREO = [
  'confirmacion',
  'reenvio_confirmacion',
  'recuperacion',
  'autorizacion_tutor',
  'reenvio_tutor',
  'confirmacion_tras_autorizacion',
  'prueba',
] as const satisfies readonly TipoCorreo[];
export const RESULTADOS_ENVIO = ['aceptado', 'rechazado', 'error', 'omitido'] as const satisfies readonly ResultadoEnvio[];
export const MOTIVOS_OMISION = [
  'cuenta_confirmada',
  'reenvio_reciente',
  'menor_pendiente',
  'menor_rechazado',
] as const satisfies readonly MotivoOmision[];
export const PROVEEDORES_CORREO = ['gmail', 'resend'] as const satisfies readonly ProveedorCorreo[];

// ---------- Textos en palabras ----------

export const TEXTO_TIPO_CORREO: Record<TipoCorreo, string> = {
  confirmacion: 'Confirmación de cuenta',
  reenvio_confirmacion: 'Reenvío de la confirmación',
  recuperacion: 'Recuperación de contraseña',
  autorizacion_tutor: 'Autorización del tutor',
  reenvio_tutor: 'Reenvío al tutor',
  confirmacion_tras_autorizacion: 'Confirmación tras la autorización',
  prueba: 'Correo de prueba',
};

export const TEXTO_RESULTADO_ENVIO: Record<ResultadoEnvio, string> = {
  aceptado: 'Entregado al proveedor',
  rechazado: 'Rechazado',
  error: 'Error',
  omitido: 'No se envió',
};

export const TEXTO_MOTIVO_OMISION: Record<MotivoOmision, string> = {
  cuenta_confirmada: 'La cuenta ya estaba confirmada',
  reenvio_reciente: 'Se envió uno hace menos de un minuto',
  menor_pendiente: 'Menor esperando a su tutor',
  menor_rechazado: 'El tutor rechazó la cuenta',
};

export const TEXTO_PROVEEDOR: Record<ProveedorCorreo, string> = { gmail: 'Gmail', resend: 'Resend' };

// Para valores que no estén en la lista (por ejemplo, un tipo nuevo antes de actualizar el panel): se muestra
// la clave con espacios, nunca un hueco.
export function enPalabras<T extends string>(textos: Record<T, string>, clave: string | null | undefined): string {
  if (!clave) return '—';
  return (textos as Record<string, string>)[clave] ?? clave.replace(/_/g, ' ');
}

// ---------- Tasa de entrega ----------

export type ConteoResultados = Record<ResultadoEnvio, number>;

export const conteoVacio = (): ConteoResultados => ({ aceptado: 0, rechazado: 0, error: 0, omitido: 0 });

// Tasa de entrega: aceptados / (aceptados + rechazados + errores), en % entero. Los omitidos no cuentan: una regla
// decidió no enviar (por ejemplo, la cuenta ya estaba confirmada), no es una falla de entrega. null si no hubo
// ningún intento de envío (no hay tasa que mostrar, ni 0 % ni 100 %).
export function tasaEntrega(conteo: Pick<ConteoResultados, 'aceptado' | 'rechazado' | 'error'>): number | null {
  const intentos = conteo.aceptado + conteo.rechazado + conteo.error;
  return intentos === 0 ? null : Math.round((conteo.aceptado / intentos) * 100);
}

export function textoTasa(tasa: number | null): string {
  return tasa === null ? 'Sin envíos' : `${tasa.toLocaleString('es-CO')} %`;
}

// ---------- Agrupaciones ----------

// Una fila agregada en SQL: cuántos registros hay de cada combinación de tipo, resultado y motivo de omisión.
export interface FilaConteoCorreos {
  tipo: string;
  resultado: string;
  motivo: string | null;
  total: number;
}

export interface ResumenCorreos {
  total: number;
  porResultado: ConteoResultados;
  tasa: number | null;
  // Solo los tipos con algún registro, de más a menos usados.
  porTipo: { tipo: string; total: number; porResultado: ConteoResultados; tasa: number | null }[];
  // Por qué no se enviaron los omitidos, de más a menos frecuente.
  omitidosPorMotivo: { motivo: string; total: number }[];
}

const esResultado = (valor: string): valor is ResultadoEnvio => (RESULTADOS_ENVIO as readonly string[]).includes(valor);

export function agruparCorreos(filas: FilaConteoCorreos[]): ResumenCorreos {
  const porResultado = conteoVacio();
  const porTipo = new Map<string, ConteoResultados>();
  const porMotivo = new Map<string, number>();
  let total = 0;

  for (const fila of filas) {
    if (!esResultado(fila.resultado) || fila.total <= 0) continue;
    total += fila.total;
    porResultado[fila.resultado] += fila.total;
    const delTipo = porTipo.get(fila.tipo) ?? conteoVacio();
    delTipo[fila.resultado] += fila.total;
    porTipo.set(fila.tipo, delTipo);
    if (fila.resultado === 'omitido' && fila.motivo) porMotivo.set(fila.motivo, (porMotivo.get(fila.motivo) ?? 0) + fila.total);
  }

  const sumar = (conteo: ConteoResultados) => conteo.aceptado + conteo.rechazado + conteo.error + conteo.omitido;
  return {
    total,
    porResultado,
    tasa: tasaEntrega(porResultado),
    porTipo: [...porTipo.entries()]
      .map(([tipo, conteo]) => ({ tipo, total: sumar(conteo), porResultado: conteo, tasa: tasaEntrega(conteo) }))
      .sort((a, b) => b.total - a.total || a.tipo.localeCompare(b.tipo)),
    omitidosPorMotivo: [...porMotivo.entries()]
      .map(([motivo, cantidad]) => ({ motivo, total: cantidad }))
      .sort((a, b) => b.total - a.total || a.motivo.localeCompare(b.motivo)),
  };
}

export interface DiaCorreos {
  dia: string; // AAAA-MM-DD, Bogotá
  aceptados: number;
  fallidos: number; // rechazados + errores
  omitidos: number;
}

// Los últimos `cantidad` días hasta hoy (incluido), del más viejo al más reciente: los días sin correos van en 0.
export function completarDias(filas: DiaCorreos[], hoy: string, cantidad: number): DiaCorreos[] {
  const porDia = new Map(filas.map((fila) => [fila.dia, fila]));
  const [anio, mes, dia] = hoy.split('-').map(Number) as [number, number, number];
  return Array.from({ length: cantidad }, (_, i) => {
    const fecha = new Date(Date.UTC(anio, mes - 1, dia - (cantidad - 1 - i)));
    const clave = fecha.toISOString().slice(0, 10);
    return porDia.get(clave) ?? { dia: clave, aceptados: 0, fallidos: 0, omitidos: 0 };
  });
}

// ---------- Periodo y filtros de la URL ----------

// registro_correos guarda 30 días (la tarea Cron borra lo anterior): no hay periodos más largos.
export const PERIODOS_CORREOS = [1, 7, 30] as const;
export type PeriodoCorreos = (typeof PERIODOS_CORREOS)[number];
export const PERIODO_CORREOS_POR_DEFECTO: PeriodoCorreos = 7;
export const DIAS_GRAFICO_CORREOS = 30;

export const TEXTO_PERIODO_CORREOS: Record<PeriodoCorreos, string> = { 1: 'Hoy', 7: 'Últimos 7 días', 30: 'Últimos 30 días' };

export function leerPeriodoCorreos(valor: string | string[] | undefined): PeriodoCorreos {
  const numero = Number(Array.isArray(valor) ? valor[0] : valor);
  return (PERIODOS_CORREOS as readonly number[]).includes(numero) ? (numero as PeriodoCorreos) : PERIODO_CORREOS_POR_DEFECTO;
}

// El error se muestra recortado en la lista; el registro ya lo guarda limpio de secretos y con 500 caracteres
// como mucho (limpiarError).
export const LARGO_ERROR_LISTA = 120;

export function recortarError(texto: string | null, largo = LARGO_ERROR_LISTA): string | null {
  if (!texto) return null;
  const limpio = texto.replace(/\s+/g, ' ').trim();
  return limpio.length > largo ? `${limpio.slice(0, largo - 1)}…` : limpio;
}

export interface FiltrosCorreos {
  // Periodo de las tarjetas (no filtra la lista). Va en la URL para que paginar o filtrar no lo pierda.
  periodo: PeriodoCorreos;
  tipo: TipoCorreo | null;
  resultado: ResultadoEnvio | null;
  proveedor: ProveedorCorreo | null;
  desde: string | null; // AAAA-MM-DD, Bogotá
  hasta: string | null;
  pagina: number;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const uno = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor)?.trim() || null;
const entre = <T extends string>(lista: readonly T[], valor: string | null): T | null =>
  valor && (lista as readonly string[]).includes(valor) ? (valor as T) : null;

// Lee los filtros de la URL y descarta lo que no sea válido (mismo criterio que Personas y Auditoría).
export function leerFiltrosCorreos(parametros: Record<string, string | string[] | undefined>): FiltrosCorreos {
  const desde = uno(parametros.desde);
  const hasta = uno(parametros.hasta);
  const pagina = Number.parseInt(uno(parametros.pagina) ?? '1', 10);
  return {
    periodo: leerPeriodoCorreos(parametros.periodo),
    tipo: entre(TIPOS_CORREO, uno(parametros.tipo)),
    resultado: entre(RESULTADOS_ENVIO, uno(parametros.resultado)),
    proveedor: entre(PROVEEDORES_CORREO, uno(parametros.proveedor)),
    desde: desde && FECHA.test(desde) ? desde : null,
    hasta: hasta && FECHA.test(hasta) ? hasta : null,
    pagina: Number.isInteger(pagina) && pagina >= 1 ? Math.min(pagina, 10_000) : 1,
  };
}

export function consultaCorreos(filtros: FiltrosCorreos, cambios: Partial<FiltrosCorreos> = {}): string {
  const f = { ...filtros, ...cambios };
  const parametros = new URLSearchParams();
  if (f.periodo !== PERIODO_CORREOS_POR_DEFECTO) parametros.set('periodo', String(f.periodo));
  if (f.tipo) parametros.set('tipo', f.tipo);
  if (f.resultado) parametros.set('resultado', f.resultado);
  if (f.proveedor) parametros.set('proveedor', f.proveedor);
  if (f.desde) parametros.set('desde', f.desde);
  if (f.hasta) parametros.set('hasta', f.hasta);
  if (f.pagina > 1) parametros.set('pagina', String(f.pagina));
  const texto = parametros.toString();
  return texto ? `?${texto}` : '';
}
