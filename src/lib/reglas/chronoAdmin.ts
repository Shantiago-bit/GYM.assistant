// Reglas de la sección CHRONO del panel de administración: uso del asistente a partir de chat_uso, que solo guarda
// CUÁNTOS mensajes envió cada cuenta cada día (nunca el contenido de las conversaciones: ese no se guarda en la
// base). Funciones puras sobre cifras ya agregadas en SQL; el "hoy" llega por parámetro. Pruebas en
// tests/reglas/chronoAdmin.test.ts.
import { mesesHasta } from '@/lib/reglas/admin';
import { restarDias } from '@/lib/reglas/fechas';

export const DIAS_GRAFICO_CHRONO = 30;
export const MESES_GRAFICO_CHRONO = 12;

const entero = (valor: number) => (Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : 0);

// ---------- Porcentajes y promedios ----------

// % entero de `parte` sobre `base`, como mucho 100; null si la base es 0 (no hay porcentaje que mostrar, igual que
// variacion() con anterior 0 o conversion() sin registradas).
export function porcentajeDe(parte: number, base: number): number | null {
  const total = entero(base);
  if (total === 0) return null;
  return Math.min(100, Math.round((entero(parte) / total) * 100));
}

export const textoPorcentaje = (valor: number | null, vacio = 'Sin datos') =>
  valor === null ? vacio : `${valor.toLocaleString('es-CO')} %`;

// Mensajes por persona que usó CHRONO, con un decimal; 0 si nadie lo usó (nunca NaN).
export function promedioPorPersona(mensajes: number, personas: number): number {
  const total = entero(personas);
  return total === 0 ? 0 : Math.round((entero(mensajes) / total) * 10) / 10;
}

// Adopción: de las personas registradas, el % que usó CHRONO alguna vez.
export const adopcion = (usaronAlgunaVez: number, registradas: number) => porcentajeDe(usaronAlgunaVez, registradas);

// Una cuenta llegó al límite un día si sus mensajes de ese día alcanzaron el límite diario. El contador de chat_uso
// no pasa del límite (consumirMensajeChat), pero si el límite bajó después, un día viejo puede tener más: por eso ≥.
// Con límite 0 (CHRONO apagado) no se cuenta nada.
export const llegoAlLimite = (mensajesDelDia: number, limite: number) => limite > 0 && mensajesDelDia >= limite;

// ---------- Series por día y por mes ----------

export interface DiaChrono {
  dia: string; // AAAA-MM-DD, Bogotá (chat_uso.fecha ya es de Bogotá)
  mensajes: number;
  personas: number;
  enLimite: number; // personas que llegaron al límite ese día
}

// Los últimos `cantidad` días hasta hoy (incluido), del más viejo al más reciente, con los días sin uso en 0.
export function completarDiasChrono(filas: DiaChrono[], hoy: string, cantidad = DIAS_GRAFICO_CHRONO): DiaChrono[] {
  const porDia = new Map(filas.map((fila) => [fila.dia, fila]));
  return Array.from({ length: cantidad }, (_, i) => {
    const dia = restarDias(hoy, cantidad - 1 - i);
    return porDia.get(dia) ?? { dia, mensajes: 0, personas: 0, enLimite: 0 };
  });
}

// Una fila de la consulta por mes: cuántos mensajes, cuántas personas usaron CHRONO, cuántas personas estuvieron
// activas (registraron al menos una sesión) y cuántas de esas activas usaron CHRONO ese mismo mes.
export interface FilaMesChrono {
  mes: string; // AAAA-MM
  mensajes: number;
  personas: number;
  activas: number;
  activasConChrono: number;
}

export interface MesChrono extends FilaMesChrono {
  // De las personas activas del mes, el % que usó CHRONO; null si nadie estuvo activa.
  porcentajeActivas: number | null;
  promedio: number; // mensajes por persona que lo usó
}

// Los últimos `cantidad` meses (del más viejo al actual), con los meses sin datos en 0.
export function completarMesesChrono(filas: FilaMesChrono[], hoy: string, cantidad = MESES_GRAFICO_CHRONO): MesChrono[] {
  const porMes = new Map(filas.map((fila) => [fila.mes, fila]));
  return mesesHasta(hoy, cantidad).map((mes) => {
    const fila = porMes.get(mes) ?? { mes, mensajes: 0, personas: 0, activas: 0, activasConChrono: 0 };
    return {
      ...fila,
      porcentajeActivas: porcentajeDe(fila.activasConChrono, fila.activas),
      promedio: promedioPorPersona(fila.mensajes, fila.personas),
    };
  });
}

// El primer día del mes más antiguo de la serie: con 12 meses y hoy en noviembre de 2026, el 1 de diciembre de 2025.
export const inicioSerieMeses = (hoy: string, cantidad = MESES_GRAFICO_CHRONO) => `${mesesHasta(hoy, cantidad)[0]!}-01`;

// ---------- Resumen de los últimos 30 días ----------

export interface TotalesChrono {
  registradas: number;
  usaronAlgunaVez: number;
  personas30: number;
  mensajes30: number;
  personasEnLimite30: number; // personas distintas que llegaron al límite al menos un día
  diasEnLimite30: number; // días-persona en el límite
}

export interface ResumenChrono extends TotalesChrono {
  adopcion: number | null;
  promedio30: number;
  // De las personas que usaron CHRONO en 30 días, el % que llegó al límite alguna vez.
  porcentajeEnLimite30: number | null;
}

export function resumirChrono(totales: TotalesChrono): ResumenChrono {
  return {
    ...totales,
    adopcion: adopcion(totales.usaronAlgunaVez, totales.registradas),
    promedio30: promedioPorPersona(totales.mensajes30, totales.personas30),
    porcentajeEnLimite30: porcentajeDe(totales.personasEnLimite30, totales.personas30),
  };
}
