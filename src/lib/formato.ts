const FORMATO_KG = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const FORMATO_FECHA = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' });

export function gramosAKg(gramos: number): number {
  return gramos / 1000;
}

export function kgAGramos(kg: number): number {
  return Math.round(kg * 1000);
}

export function formatearPeso(gramos: number): string {
  return `${FORMATO_KG.format(gramosAKg(gramos))} kg`;
}

export function formatearFecha(fecha: string): string {
  return FORMATO_FECHA.format(new Date(`${fecha}T00:00:00Z`));
}
