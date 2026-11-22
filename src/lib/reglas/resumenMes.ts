// "Tu mes en el gym": el resumen de un mes (AAAA-MM) para la historia de /gym/mi-mes y la imagen para compartir.
// Puro: recibe las sesiones y las marcas ya consultadas. Fechas AAAA-MM-DD en la zona horaria de la app.
import { formatearPeso } from '@/lib/formato';
import { restarDias } from '@/lib/reglas/fechas';
import type { MarcaSesion, SesionInicio } from '@/lib/reglas/inicio';
import { calcularRacha, type TramoDias } from '@/lib/reglas/racha';
import { esEfectiva, volumenSerie } from '@/lib/reglas/tecnicas';

export const PR_DEL_MES_MAXIMO = 3;
const MES_VALIDO = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function esMesValido(mes: string): boolean {
  return MES_VALIDO.test(mes);
}

export function mesDeFecha(fecha: string): string {
  return fecha.slice(0, 7);
}

export function primerDia(mes: string): string {
  return `${mes}-01`;
}

export function ultimoDia(mes: string): string {
  const [anio, numero] = mes.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(anio, numero, 0)).toISOString().slice(0, 10);
}

export function mesAnterior(mes: string): string {
  return mesDeFecha(restarDias(primerDia(mes), 1));
}

const FORMATO_MES = new Intl.DateTimeFormat('es-CO', { month: 'long', timeZone: 'UTC' });
const FORMATO_MES_ANIO = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });

// "noviembre" y "noviembre de 2026".
export function nombreMes(mes: string, conAnio = false): string {
  return (conAnio ? FORMATO_MES_ANIO : FORMATO_MES).format(new Date(`${primerDia(mes)}T00:00:00Z`));
}

// "Noviembre de 2026" (solo la primera letra: el capitalize de CSS daría "Noviembre De 2026").
export function tituloMes(mes: string): string {
  const texto = nombreMes(mes, true);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export interface RecordMes {
  ejercicioId: string;
  nombre: string;
  tipo: 'peso' | 'calistenia';
  fecha: string;
  pesoGramos: number | null; // con peso: el mayor peso; con tu cuerpo, null
  reps: number;
}

export interface ResumenMes {
  mes: string;
  sesiones: number;
  dias: number;
  mejorRacha: number;
  records: RecordMes[]; // hasta PR_DEL_MES_MAXIMO, el más reciente primero
  totalRecords: number;
  estrella: { ejercicioId: string; nombre: string; sesiones: number } | null;
  volumenKg: number;
  anterior: { sesiones: number; dias: number; volumenKg: number };
}

const enMes = (fecha: string, mes: string) => mesDeFecha(fecha) === mes;
const volumen = (sesiones: SesionInicio[]) =>
  Math.round(
    sesiones.reduce((total, sesion) => total + sesion.series.filter(esEfectiva).reduce((suma, serie) => suma + volumenSerie(serie), 0), 0) /
      1000,
  );

// Récords logrados en el mes: cada vez que una marca supera la mejor anterior del ejercicio (con peso, el mayor
// peso y, ante el mismo, más repeticiones; con tu cuerpo, más repeticiones). La primera sesión de un ejercicio no
// es un récord (no supera nada). Por ejercicio queda el último récord del mes.
function recordsDelMes(marcas: MarcaSesion[], mes: string): RecordMes[] {
  const mejores = new Map<string, { peso: number; reps: number }>();
  const delMes = new Map<string, RecordMes>();
  for (const marca of [...marcas].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const actual =
      marca.tipo === 'calistenia'
        ? marca.repsMax === null
          ? null
          : { peso: 0, reps: marca.repsMax }
        : marca.pesoMaxGramos === null
          ? null
          : { peso: marca.pesoMaxGramos, reps: marca.repsEnPesoMax ?? 0 };
    if (!actual) continue;
    const anterior = mejores.get(marca.ejercicioId);
    const supera = anterior !== undefined && (actual.peso - anterior.peso || actual.reps - anterior.reps) > 0;
    if (!anterior || supera) mejores.set(marca.ejercicioId, actual);
    if (supera && enMes(marca.fecha, mes)) {
      delMes.set(marca.ejercicioId, {
        ejercicioId: marca.ejercicioId,
        nombre: marca.nombre,
        tipo: marca.tipo,
        fecha: marca.fecha,
        pesoGramos: marca.tipo === 'peso' ? actual.peso : null,
        reps: actual.reps,
      });
    }
  }
  return [...delMes.values()].sort((a, b) => b.fecha.localeCompare(a.fecha) || a.nombre.localeCompare(b.nombre, 'es'));
}

export function resumenMes(d: {
  mes: string;
  // Sesiones del mes y del anterior (de cualquier ejercicio, archivados incluidos).
  sesiones: SesionInicio[];
  // Una fila por sesión de los ejercicios activos, de todo el historial (para saber si una marca es récord).
  marcas: MarcaSesion[];
  historialDias: TramoDias[];
}): ResumenMes {
  const delMes = d.sesiones.filter((sesion) => enMes(sesion.fecha, d.mes));
  const previo = mesAnterior(d.mes);
  const delAnterior = d.sesiones.filter((sesion) => enMes(sesion.fecha, previo));
  const fechas = [...new Set(delMes.map((sesion) => sesion.fecha))];
  const fechasAnterior = new Set(delAnterior.map((sesion) => sesion.fecha));

  // La mejor racha dentro del mes: las mismas reglas de la racha (tus días elegidos), solo con las fechas del mes.
  const mejorRacha = fechas.length === 0 ? 0 : calcularRacha(fechas, ultimoDia(d.mes), d.historialDias).mejor;

  const conteo = new Map<string, { ejercicioId: string; nombre: string; sesiones: number }>();
  for (const sesion of delMes) {
    const actual = conteo.get(sesion.ejercicioId) ?? { ejercicioId: sesion.ejercicioId, nombre: sesion.nombre, sesiones: 0 };
    actual.sesiones += 1;
    conteo.set(sesion.ejercicioId, actual);
  }
  const estrella = [...conteo.values()].sort((a, b) => b.sesiones - a.sesiones || a.nombre.localeCompare(b.nombre, 'es'))[0] ?? null;
  const records = recordsDelMes(d.marcas, d.mes);

  return {
    mes: d.mes,
    sesiones: delMes.length,
    dias: fechas.length,
    mejorRacha,
    records: records.slice(0, PR_DEL_MES_MAXIMO),
    totalRecords: records.length,
    estrella,
    volumenKg: volumen(delMes),
    anterior: { sesiones: delAnterior.length, dias: fechasAnterior.size, volumenKg: volumen(delAnterior) },
  };
}

// "62,5 kg × 8" o "15 repeticiones".
export function textoRecord(record: RecordMes): string {
  return record.pesoGramos === null ? `${record.reps} repeticiones` : `${formatearPeso(record.pesoGramos)} × ${record.reps}`;
}

// "3 más que en octubre", "2 menos que en octubre", "igual que en octubre".
export function textoComparacion(actual: number, anterior: number, mes: string): string {
  const diferencia = actual - anterior;
  const enMesAnterior = `en ${nombreMes(mesAnterior(mes))}`;
  if (diferencia === 0) return `igual que ${enMesAnterior}`;
  return `${Math.abs(diferencia)} ${diferencia > 0 ? 'más' : 'menos'} que ${enMesAnterior}`;
}

// El aviso "Tu mes de … está listo" sale la primera semana del mes siguiente (del 1 al 7), si ese mes tuvo sesiones
// y la persona no lo cerró.
export const DIAS_AVISO_MES = 7;

export function mesDelAviso(hoy: string, cerrado: string | null, huboSesiones: boolean): string | null {
  if (Number(hoy.slice(8)) > DIAS_AVISO_MES || !huboSesiones) return null;
  const mes = mesAnterior(mesDeFecha(hoy));
  return cerrado === mes ? null : mes;
}

// Textos de la imagen para compartir. Por defecto, sin pesos, sin correo y sin nombre: solo días, racha, cantidad
// de récords y ejercicio estrella. El apodo y los pesos de los récords solo si la persona los enciende.
export interface OpcionesImagen {
  apodo: string | null; // ya decidido: null si "Mostrar mi apodo" está apagado
  conPesos: boolean;
}

export function textosImagen(resumen: ResumenMes, opciones: OpcionesImagen): {
  titulo: string;
  cifras: { valor: string; etiqueta: string }[];
  records: string[];
  estrella: string | null;
} {
  const titulo = opciones.apodo ? `El mes de ${opciones.apodo} en el gym` : 'Mi mes en el gym';
  return {
    titulo,
    cifras: [
      { valor: String(resumen.dias), etiqueta: resumen.dias === 1 ? 'día entrenado' : 'días entrenados' },
      { valor: String(resumen.mejorRacha), etiqueta: resumen.mejorRacha === 1 ? 'día de racha' : 'días de racha' },
      { valor: String(resumen.totalRecords), etiqueta: resumen.totalRecords === 1 ? 'récord personal' : 'récords personales' },
    ],
    records: opciones.conPesos ? resumen.records.map((record) => `${record.nombre}: ${textoRecord(record)}`) : [],
    estrella: resumen.estrella ? resumen.estrella.nombre : null,
  };
}
