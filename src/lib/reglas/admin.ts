// Reglas del panel de administración: definiciones de las métricas y cálculos sobre cifras ya agregadas.
// Funciones puras (sin base de datos, red ni reloj propio): el "ahora" llega por parámetro. Pruebas en
// tests/reglas/admin.test.ts. Las definiciones están también en Doc/PLAN_GYM.md (sección de métricas).

import { ZONA_HORARIA } from '@/lib/config/gym';

// ---------- Definiciones ----------

// Persona activa: registró al menos una sesión (incluida la prueba inicial) en el periodo. Las fechas de las
// sesiones ya están en hora de Bogotá (se guardan con hoyBogota()).
export function esPersonaActiva(sesionesEnPeriodo: number): boolean {
  return sesionesEnPeriodo > 0;
}

export type Variacion =
  | { tipo: 'cambio'; porcentaje: number } // con signo: 18 = subió 18 %, -12 = bajó 12 %
  | { tipo: 'nuevo' } // el periodo anterior fue 0 y este no: no hay porcentaje que mostrar
  | { tipo: 'igual' }; // los dos periodos en 0

// (actual − anterior) / anterior. Con anterior = 0 no hay porcentaje (sería infinito): "nuevo".
export function variacion(actual: number, anterior: number): Variacion {
  if (anterior === 0) return actual === 0 ? { tipo: 'igual' } : { tipo: 'nuevo' };
  return { tipo: 'cambio', porcentaje: Math.round(((actual - anterior) / anterior) * 100) };
}

export function textoVariacion(v: Variacion): string {
  if (v.tipo === 'nuevo') return 'nuevo';
  if (v.tipo === 'igual' || v.porcentaje === 0) return 'sin cambio';
  return `${v.porcentaje > 0 ? '+' : '−'}${Math.abs(v.porcentaje).toLocaleString('es-CO')} %`;
}

// Para la insignia: verde si sube (o es nuevo), roja si baja, neutra si no cambia.
export function sentidoVariacion(v: Variacion): 'sube' | 'baja' | 'igual' {
  if (v.tipo === 'nuevo') return 'sube';
  if (v.tipo === 'igual' || v.porcentaje === 0) return 'igual';
  return v.porcentaje > 0 ? 'sube' : 'baja';
}

// ---------- Meta mensual ----------

// Límites de la meta de personas activas por mes. Son los mismos del CHECK de metas_admin.valor.
export const META_MINIMA = 1;
export const META_MAXIMA = 1_000_000;

// Una meta válida es un número entero entre META_MINIMA y META_MAXIMA. No acepta textos ("50") ni decimales.
export function esMetaValida(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= META_MINIMA && valor <= META_MAXIMA;
}

export interface ProyeccionMeta {
  meta: number;
  activas: number;
  // Proyección lineal a fin de mes: (activas / días transcurridos) × días del mes. Es una aproximación: las
  // personas activas no se suman día a día (una misma persona cuenta una vez al mes).
  proyeccion: number;
  enCamino: boolean;
  faltan: number;
  // Personas nuevas activas que harían falta por cada día que queda (sin contar hoy) para cumplir la meta.
  faltanPorDia: number;
  porcentaje: number; // activas frente a la meta, de 0 a 100
}

export function proyectarMeta(datos: { activas: number; meta: number; dia: number; diasDelMes: number }): ProyeccionMeta {
  const { activas, meta, dia, diasDelMes } = datos;
  const transcurridos = Math.min(Math.max(dia, 1), diasDelMes);
  const proyeccion = Math.round((activas / transcurridos) * diasDelMes);
  const faltan = Math.max(0, meta - activas);
  const diasRestantes = diasDelMes - transcurridos;
  return {
    meta,
    activas,
    proyeccion,
    enCamino: activas >= meta || proyeccion >= meta,
    faltan,
    faltanPorDia: faltan === 0 ? 0 : diasRestantes > 0 ? Math.ceil(faltan / diasRestantes) : faltan,
    porcentaje: meta > 0 ? Math.min(100, Math.round((activas / meta) * 100)) : 0,
  };
}

// ---------- Fechas del panel (America/Bogota) ----------

// Hora (0–23) y fecha de hoy en Bogotá para un instante dado.
export function horaBogota(instante: Date): number {
  const hora = new Intl.DateTimeFormat('en-US', { timeZone: ZONA_HORARIA, hour: 'numeric', hourCycle: 'h23' }).format(instante);
  return Number.parseInt(hora, 10) % 24;
}

export function saludoSegunHora(hora: number): string {
  if (hora >= 5 && hora < 12) return 'Buenos días';
  if (hora >= 12 && hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

// 'YYYY-MM' del mes de una fecha 'YYYY-MM-DD'.
export const mesDe = (fecha: string): string => fecha.slice(0, 7);

export function diasDelMes(mes: string): number {
  const [anio, numero] = mes.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(anio, numero, 0)).getUTCDate();
}

// Los últimos `cantidad` meses hasta el de `hoy`, del más viejo al actual: ['2025-12', …, '2026-11'].
export function mesesHasta(hoy: string, cantidad: number): string[] {
  const [anio, mes] = hoy.split('-').map(Number) as [number, number];
  return Array.from({ length: cantidad }, (_, i) => {
    const fecha = new Date(Date.UTC(anio, mes - 1 - (cantidad - 1 - i), 1));
    return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

export function etiquetaMes(mes: string, conAnio = false): string {
  const [anio, numero] = mes.split('-').map(Number) as [number, number];
  return conAnio ? `${MESES_CORTOS[numero - 1]} ${anio}` : MESES_CORTOS[numero - 1]!;
}

// ---------- Series mensuales ----------

export interface FilaMensual {
  mes: string; // 'YYYY-MM'
  registros: number;
  activas: number;
  sesiones: number;
  series: number;
  mensajes: number;
}

export type MetricaResumen = 'registros' | 'activas' | 'sesiones';
export const PERIODOS_RESUMEN = [3, 6, 12] as const;
export type PeriodoResumen = (typeof PERIODOS_RESUMEN)[number];

// Completa con ceros los meses sin datos, en orden, para los últimos `cantidad` meses hasta `hoy`.
export function completarMeses(filas: FilaMensual[], hoy: string, cantidad: number): FilaMensual[] {
  const porMes = new Map(filas.map((fila) => [fila.mes, fila]));
  return mesesHasta(hoy, cantidad).map(
    (mes) => porMes.get(mes) ?? { mes, registros: 0, activas: 0, sesiones: 0, series: 0, mensajes: 0 },
  );
}

export function promedio(valores: number[]): number {
  return valores.length === 0 ? 0 : valores.reduce((suma, valor) => suma + valor, 0) / valores.length;
}

// ---------- Lo que necesita atención ----------

export interface Pendientes {
  correosConError24h: number;
  tutoresPorVencer48h: number;
  sinConfirmarMas48h: number;
}

export function cosasPorAtender(p: Pendientes): { total: number; detalles: string[] } {
  const detalles: string[] = [];
  const plural = (n: number, uno: string, varios: string) => `${n.toLocaleString('es-CO')} ${n === 1 ? uno : varios}`;
  if (p.correosConError24h > 0) {
    detalles.push(plural(p.correosConError24h, 'correo con error en las últimas 24 h', 'correos con error en las últimas 24 h'));
  }
  if (p.tutoresPorVencer48h > 0) {
    detalles.push(plural(p.tutoresPorVencer48h, 'autorización de tutor vence en menos de 48 h', 'autorizaciones de tutor vencen en menos de 48 h'));
  }
  if (p.sinConfirmarMas48h > 0) {
    detalles.push(plural(p.sinConfirmarMas48h, 'cuenta sin confirmar desde hace más de 48 h', 'cuentas sin confirmar desde hace más de 48 h'));
  }
  return { total: p.correosConError24h + p.tutoresPorVencer48h + p.sinConfirmarMas48h, detalles };
}

// ---------- Exportación CSV ----------

// Una celda de CSV: entre comillas si tiene separador, comillas o saltos de línea. Las que empiezan con
// =, +, - o @ se prefijan con ' para que una hoja de cálculo no las ejecute como fórmula.
export function celdaCsv(valor: string | number): string {
  let texto = String(valor);
  if (typeof valor === 'string' && /^[=+\-@]/.test(texto)) texto = `'${texto}`;
  return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function aCsv(encabezados: string[], filas: (string | number)[][]): string {
  return [encabezados, ...filas].map((fila) => fila.map(celdaCsv).join(',')).join('\r\n') + '\r\n';
}

// Resumen exportable: solo cifras agregadas por mes. Nunca correos, nombres ni ids.
export function csvResumen(filas: FilaMensual[]): string {
  return aCsv(
    ['mes', 'registros', 'personas_activas', 'sesiones', 'series', 'mensajes_chrono'],
    filas.map((fila) => [fila.mes, fila.registros, fila.activas, fila.sesiones, fila.series, fila.mensajes]),
  );
}
