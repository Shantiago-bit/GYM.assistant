import { RANGOS_POR_ENFOQUE } from '@/lib/config/gym';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

export type TipoEjercicio = 'peso' | 'calistenia';
export type Enfoque = 'fuerza' | 'hipertrofia' | 'resistencia';

export const ENFOQUES: { valor: Enfoque; texto: string; descripcion: string }[] = [
  { valor: 'fuerza', texto: 'Fuerza', descripcion: 'Pocas repeticiones con mucha carga.' },
  { valor: 'hipertrofia', texto: 'Hipertrofia', descripcion: 'Rango medio para ganar músculo.' },
  { valor: 'resistencia', texto: 'Resistencia', descripcion: 'Muchas repeticiones con carga ligera.' },
];

// Al crear un ejercicio con el nombre de uno archivado de la cuenta, se ofrece restaurarlo.
export function mensajeEjercicioArchivado(nombre: string): string {
  return `Ya tienes «${nombre}» archivado. ¿Quieres restaurarlo?`;
}

export function textoEnfoque(enfoque: Enfoque): string {
  return ENFOQUES.find((opcion) => opcion.valor === enfoque)?.texto ?? enfoque;
}

export function rangoPorTipo(tipo: TipoEjercicio, enfoque: Enfoque = 'hipertrofia'): [number, number] {
  const [min, max] = RANGOS_POR_ENFOQUE[enfoque][tipo];
  return [min, max];
}

export function validarEjercicio(d: {
  nombre: string;
  tipo: TipoEjercicio;
  pesoRefGramos?: number | null;
  nivel?: string | null;
  rangoMin?: number;
  rangoMax?: number;
}): void {
  if (d.nombre.trim().length === 0) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'El nombre del ejercicio es obligatorio.');
  }
  if (d.tipo !== 'peso' && d.tipo !== 'calistenia') {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'El tipo de ejercicio no es válido.');
  }

  const [minPorDefecto, maxPorDefecto] = rangoPorTipo(d.tipo);
  const rangoMin = d.rangoMin ?? minPorDefecto;
  const rangoMax = d.rangoMax ?? maxPorDefecto;

  if (!Number.isInteger(rangoMin) || !Number.isInteger(rangoMax) || rangoMin < 1 || rangoMin > rangoMax) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'El rango objetivo no es válido.');
  }

  const tienePeso = d.pesoRefGramos !== null && d.pesoRefGramos !== undefined;

  if (d.tipo === 'peso' && (!tienePeso || !Number.isInteger(d.pesoRefGramos) || d.pesoRefGramos! < 0)) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Un ejercicio de peso necesita su peso de referencia.');
  }
  if (d.tipo === 'calistenia' && tienePeso) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Un ejercicio de calistenia no lleva peso.');
  }
}
