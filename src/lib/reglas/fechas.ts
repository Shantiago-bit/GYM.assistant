import { ZONA_HORARIA } from '@/lib/config/gym';

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// en-CA formatea como YYYY-MM-DD.
export function hoyBogota(reloj: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(reloj);
}

export function esFechaValida(fecha: string): boolean {
  if (!FORMATO_FECHA.test(fecha)) {
    return false;
  }

  const instante = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(instante.getTime()) && instante.toISOString().startsWith(fecha);
}

export function esFechaFutura(fecha: string, hoy: string): boolean {
  return fecha > hoy;
}
