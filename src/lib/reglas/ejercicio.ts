import { RANGO_CALISTENIA, RANGO_PESO } from '@/lib/config/gym';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

export type TipoEjercicio = 'peso' | 'calistenia';

export function rangoPorTipo(tipo: TipoEjercicio): [number, number] {
  const [min, max] = tipo === 'peso' ? RANGO_PESO : RANGO_CALISTENIA;
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
