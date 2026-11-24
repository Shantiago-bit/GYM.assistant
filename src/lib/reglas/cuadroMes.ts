import { constelacionDe, type Constelacion } from '@/lib/constelaciones';
import { formatearPeso } from '@/lib/formato';
import { estadoConstelacion } from '@/lib/reglas/constelacion';
import { restarDias } from '@/lib/reglas/fechas';
import type { EjercicioConHistorial } from '@/lib/reglas/perfil';
import { calcularRacha, diaSemana, type TramoDias } from '@/lib/reglas/racha';
import { mesAnterior, mesDeFecha, nombreMes, primerDia, ultimoDia } from '@/lib/reglas/resumenMes';
import { esEfectiva, volumenSerie } from '@/lib/reglas/tecnicas';

// La "Galería de meses" del Museo: cada mes es un cuadro, "El cielo de <mes>". Funciones puras (con pruebas).
// - Cada día entrenado es una estrella en una cuadrícula de calendario: columnas por semana, filas por día (lunes
//   arriba), con un tamaño según el volumen de ese día.
// - Las semanas completadas (constelación de la semana completa) aparecen dibujadas arriba con su geometría.
// - Los días con récord llevan una estrella grande color acento.
// Lienzo: 100 × 125 (4:5). Fechas AAAA-MM-DD en la zona horaria de la app.
export const ANCHO_LIENZO = 100;
export const ALTO_LIENZO = 125;
const CUADRICULA = { x: 10, y: 46, ancho: 80, alto: 70 } as const;
const RADIO = { minimo: 1.1, maximo: 2.6 } as const;

export interface RecordDia {
  nombre: string;
  marca: string; // "62,5 kg × 9" o "15 repeticiones"
}

export interface EstrellaDia {
  fecha: string;
  x: number;
  y: number;
  radio: number;
  records: RecordDia[];
}

export interface ConstelacionSemana {
  lunes: string;
  constelacion: Constelacion;
  x: number; // centro de la figura en el lienzo
  y: number;
  escala: number;
}

export interface DatosCuadro {
  mes: string;
  actual: boolean; // el mes en curso: un cuadro "en proceso"
  ultimoDia: string;
  dias: number;
  sesiones: number;
  volumenKg: number;
  mejorRacha: number;
  records: (RecordDia & { fecha: string })[];
  estrella: { nombre: string; sesiones: number } | null;
  estrellas: EstrellaDia[];
  constelaciones: ConstelacionSemana[];
  semanasCompletasSeguidas: number;
  regreso: boolean; // el mes anterior no tuvo sesiones, pero alguno antes sí
  primerMes: boolean;
  tono: number; // 0 a 11: el degradado propio del mes
  titulo: string;
}

// Semana del mes (columna) de una fecha: la primera columna es la semana del día 1.
export function columnaDeFecha(fecha: string, mes: string): number {
  const desfase = diaSemana(primerDia(mes)) - 1; // lunes = 0
  return Math.floor((Number(fecha.slice(8)) - 1 + desfase) / 7);
}

// Posición y tamaño de las estrellas de un mes: columna por semana, fila por día (lunes arriba) y radio según el
// volumen del día (el día de más volumen, el más grande; sin volumen, el mínimo).
export function posicionesDelMes(mes: string, dias: { fecha: string; volumen: number }[]): { fecha: string; x: number; y: number; radio: number }[] {
  const columnas = columnaDeFecha(ultimoDia(mes), mes) + 1;
  const maximo = Math.max(0, ...dias.map((dia) => dia.volumen));
  return [...dias]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((dia) => {
      const columna = columnaDeFecha(dia.fecha, mes);
      const fila = diaSemana(dia.fecha) - 1;
      const proporcion = maximo > 0 ? dia.volumen / maximo : 0;
      return {
        fecha: dia.fecha,
        x: Math.round((CUADRICULA.x + ((columna + 0.5) * CUADRICULA.ancho) / columnas) * 10) / 10,
        y: Math.round((CUADRICULA.y + ((fila + 0.5) * CUADRICULA.alto) / 7) * 10) / 10,
        radio: Math.round((RADIO.minimo + proporcion * (RADIO.maximo - RADIO.minimo)) * 100) / 100,
      };
    });
}

// El título de la cartela, con reglas (en este orden):
// "El mes del récord" (3 o más récords) · "La constancia de <mes>" (3 o más semanas completas seguidas) ·
// "El regreso" (vuelve después de un mes sin sesiones) · "Primeros pasos" (el primer mes) · "<Mes>, en movimiento".
export function tituloCartela(d: { mes: string; records: number; semanasCompletasSeguidas: number; regreso: boolean; primerMes: boolean }): string {
  if (d.records >= 3) return 'El mes del récord';
  if (d.semanasCompletasSeguidas >= 3) return `La constancia de ${nombreMes(d.mes)}`;
  if (d.regreso) return 'El regreso';
  if (d.primerMes) return 'Primeros pasos';
  const nombre = nombreMes(d.mes);
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)}, en movimiento`;
}

// "12 días · 3 récords · racha de 9"
export function lineaCartela(d: Pick<DatosCuadro, 'dias' | 'records' | 'mejorRacha'>): string {
  const partes = [`${d.dias} ${d.dias === 1 ? 'día' : 'días'}`, `${d.records.length} ${d.records.length === 1 ? 'récord' : 'récords'}`];
  if (d.mejorRacha > 0) partes.push(`racha de ${d.mejorRacha}`);
  return partes.join(' · ');
}

// Récords: cada vez que una marca supera la mejor anterior del ejercicio (las mismas reglas del resumen del mes:
// con peso, el mayor peso y, ante el mismo, más repeticiones; con tu cuerpo, más repeticiones). La primera sesión de
// un ejercicio no es un récord.
export function recordsPorFecha(historial: EjercicioConHistorial[]): Map<string, RecordDia[]> {
  const porFecha = new Map<string, RecordDia[]>();
  for (const ejercicio of historial) {
    let mejor: { peso: number; reps: number } | null = null;
    for (const sesion of [...ejercicio.sesiones].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
      const efectivas = sesion.series.filter(esEfectiva);
      if (efectivas.length === 0) continue;
      let actual: { peso: number; reps: number };
      if (ejercicio.tipo === 'peso') {
        const conPeso = efectivas.filter((serie) => serie.pesoGramos !== null);
        if (conPeso.length === 0) continue;
        const peso = Math.max(...conPeso.map((serie) => serie.pesoGramos!));
        actual = { peso, reps: Math.max(...conPeso.filter((serie) => serie.pesoGramos === peso).map((serie) => serie.reps)) };
      } else {
        actual = { peso: 0, reps: Math.max(...efectivas.map((serie) => serie.reps)) };
      }
      const supera = mejor !== null && (actual.peso - mejor.peso || actual.reps - mejor.reps) > 0;
      if (mejor === null || supera) mejor = actual;
      if (supera) {
        const marca = ejercicio.tipo === 'peso' ? `${formatearPeso(actual.peso)} × ${actual.reps}` : `${actual.reps} repeticiones`;
        porFecha.set(sesion.fecha, [...(porFecha.get(sesion.fecha) ?? []), { nombre: ejercicio.nombre, marca }]);
      }
    }
  }
  return porFecha;
}

const lunesDe = (fecha: string) => restarDias(fecha, diaSemana(fecha) - 1);

// Los cuadros de la galería, del más reciente al más antiguo: el mes en curso siempre (en proceso) y los anteriores
// con sesiones.
export function cuadrosDeMeses(d: { historial: EjercicioConHistorial[]; historialDias: TramoDias[]; hoy: string; maximo?: number }): DatosCuadro[] {
  const actual = mesDeFecha(d.hoy);
  const records = recordsPorFecha(d.historial);
  const sesiones = d.historial.flatMap((ejercicio) =>
    ejercicio.sesiones
      .filter((sesion) => sesion.fecha <= d.hoy)
      .map((sesion) => ({
        fecha: sesion.fecha,
        nombre: ejercicio.nombre,
        volumen: sesion.series.filter(esEfectiva).reduce((suma, serie) => suma + volumenSerie(serie), 0) / 1000,
      })),
  );
  const fechas = [...new Set(sesiones.map((sesion) => sesion.fecha))].sort();
  const mesesConSesiones = new Set(fechas.map(mesDeFecha));
  const primero = fechas[0] ? mesDeFecha(fechas[0]) : actual;
  const meses = [...new Set([actual, ...mesesConSesiones])].sort((a, b) => b.localeCompare(a)).slice(0, d.maximo ?? 48);

  return meses.map((mes) => {
    const delMes = sesiones.filter((sesion) => mesDeFecha(sesion.fecha) === mes);
    const fechasMes = [...new Set(delMes.map((sesion) => sesion.fecha))].sort();
    const volumenPorDia = new Map<string, number>();
    for (const sesion of delMes) volumenPorDia.set(sesion.fecha, (volumenPorDia.get(sesion.fecha) ?? 0) + sesion.volumen);
    const estrellas = posicionesDelMes(
      mes,
      fechasMes.map((fecha) => ({ fecha, volumen: volumenPorDia.get(fecha) ?? 0 })),
    ).map((posicion) => ({ ...posicion, records: records.get(posicion.fecha) ?? [] }));

    // Semanas completadas: las que terminan (domingo) dentro del mes, ya cerradas, con la constelación completa.
    const columnas = columnaDeFecha(ultimoDia(mes), mes) + 1;
    const constelaciones: ConstelacionSemana[] = [];
    const completas: boolean[] = [];
    for (let lunes = lunesDe(primerDia(mes)); lunes <= ultimoDia(mes); lunes = restarDias(lunes, -7)) {
      const domingo = restarDias(lunes, -6);
      if (mesDeFecha(domingo) !== mes || domingo > d.hoy) continue;
      const estado = estadoConstelacion({ hoy: domingo, historialDias: d.historialDias, fechasConSesion: fechas });
      completas.push(estado.completa && estado.total > 0);
      if (estado.completa && estado.total > 0) {
        const columna = columnaDeFecha(domingo, mes);
        constelaciones.push({
          lunes,
          constelacion: constelacionDe(estado.total),
          x: CUADRICULA.x + ((columna + 0.5) * CUADRICULA.ancho) / columnas,
          y: 24,
          escala: Math.min(CUADRICULA.ancho / columnas / 100, 0.3),
        });
      }
    }
    let seguidas = 0;
    let mejorSeguidas = 0;
    for (const completa of completas) {
      seguidas = completa ? seguidas + 1 : 0;
      mejorSeguidas = Math.max(mejorSeguidas, seguidas);
    }

    const conteo = new Map<string, number>();
    for (const sesion of delMes) conteo.set(sesion.nombre, (conteo.get(sesion.nombre) ?? 0) + 1);
    const [estrella] = [...conteo.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'));
    // Un récord por ejercicio (el mejor del mes, que es el último), como el resumen del mes y la imagen para
    // compartir: así la cartela y la imagen cuentan lo mismo. Las estrellas de cada día conservan todos.
    const ultimoPorEjercicio = new Map<string, RecordDia & { fecha: string }>();
    for (const fecha of fechasMes) for (const record of records.get(fecha) ?? []) ultimoPorEjercicio.set(record.nombre, { ...record, fecha });
    const recordsMes = [...ultimoPorEjercicio.values()].sort((x, y) => y.fecha.localeCompare(x.fecha));
    const regreso = mes > primero && !mesesConSesiones.has(mesAnterior(mes)) && fechasMes.length > 0;
    const primerMes = mes === primero && fechasMes.length > 0;
    const datos = {
      mes,
      actual: mes === actual,
      ultimoDia: ultimoDia(mes),
      dias: fechasMes.length,
      sesiones: delMes.length,
      volumenKg: Math.round(delMes.reduce((suma, sesion) => suma + sesion.volumen, 0)),
      mejorRacha: fechasMes.length === 0 ? 0 : calcularRacha(fechasMes, ultimoDia(mes), d.historialDias).mejor,
      records: recordsMes,
      estrella: estrella ? { nombre: estrella[0], sesiones: estrella[1] } : null,
      estrellas,
      constelaciones,
      semanasCompletasSeguidas: mejorSeguidas,
      regreso,
      primerMes,
      tono: (Number(mes.slice(5)) - 1) % 12,
    };
    return {
      ...datos,
      titulo: tituloCartela({ mes, records: recordsMes.length, semanasCompletasSeguidas: mejorSeguidas, regreso, primerMes }),
    };
  });
}
