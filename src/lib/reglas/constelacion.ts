import { constelacionDe, type Constelacion } from '@/lib/constelaciones';
import { restarDias } from '@/lib/reglas/fechas';
import { inicioDeSemana } from '@/lib/reglas/inicio';
import { diasEnFecha, esDiaPlanificado, type TramoDias } from '@/lib/reglas/racha';

// "Tu constelación de la semana" (fondo del inicio). Fechas AAAA-MM-DD en la zona horaria de la app
// (America/Bogota); la semana va de lunes a domingo, la misma de la tira de la semana.
// - La figura depende de CUÁNTOS días eligió la persona (los vigentes hoy): una estrella por día planificado.
// - Cada día PLANIFICADO ya entrenado esta semana enciende la siguiente estrella, en orden. Si cambió sus días a
//   mitad de semana, la figura cambia desde ese momento y se encienden tantas estrellas como días planificados
//   (según los días vigentes ese día) ya entrenados, sin pasar del total.
// - Un día entrenado NO planificado no enciende estrellas: hoy lanza una estrella fugaz (y suma a la racha, como
//   ya hace la regla de la racha).
// - Una línea se traza cuando sus dos estrellas están encendidas: las figuras cerradas se cierran con la última.
// - Cada lunes la semana reinicia, con la constelación apagada.
export interface EstadoConstelacion {
  semana: string; // el lunes de la semana
  constelacion: Constelacion;
  total: number;
  encendidas: number;
  lineasEncendidas: boolean[];
  completa: boolean;
  estrellaFugaz: boolean; // hoy se entrenó un día no planificado
  diasExtra: number; // días entrenados no planificados esta semana
}

export function estadoConstelacion(d: { hoy: string; historialDias: TramoDias[]; fechasConSesion: string[] }): EstadoConstelacion {
  const semana = inicioDeSemana(d.hoy);
  const constelacion = constelacionDe(diasEnFecha(d.historialDias, d.hoy).length);
  const total = constelacion.estrellas.length;
  const entrenadas = new Set(d.fechasConSesion);

  let planificadosEntrenados = 0;
  let diasExtra = 0;
  for (let indice = 0; indice < 7; indice++) {
    const fecha = restarDias(semana, -indice);
    if (fecha > d.hoy) break;
    if (!entrenadas.has(fecha)) continue;
    if (esDiaPlanificado(fecha, d.historialDias)) planificadosEntrenados++;
    else diasExtra++;
  }

  const encendidas = Math.min(total, planificadosEntrenados);
  return {
    semana,
    constelacion,
    total,
    encendidas,
    lineasEncendidas: constelacion.lineas.map(([a, b]) => a < encendidas && b < encendidas),
    completa: encendidas === total,
    estrellaFugaz: entrenadas.has(d.hoy) && !esDiaPlanificado(d.hoy, d.historialDias),
    diasExtra,
  };
}

// "Tu constelación: Casiopea · 3 de 5 estrellas"
export function textoConstelacion(estado: EstadoConstelacion): string {
  const estrellas = estado.total === 1 ? 'estrella' : 'estrellas';
  return `${estado.encendidas} de ${estado.total} ${estrellas}`;
}
