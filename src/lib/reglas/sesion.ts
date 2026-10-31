import type { TipoEjercicio } from '@/lib/reglas/ejercicio';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

export interface SerieEntrada {
  reps: number;
  pesoGramos?: number | null;
}

export function validarSesion(series: SerieEntrada[], tipo: TipoEjercicio): void {
  if (series.length === 0) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'La sesión necesita al menos una serie.');
  }

  for (const serie of series) {
    if (!Number.isInteger(serie.reps) || serie.reps < 0) {
      throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Las repeticiones deben ser un entero mayor o igual a 0.');
    }

    const tienePeso = serie.pesoGramos !== null && serie.pesoGramos !== undefined;

    if (tipo === 'peso' && (!tienePeso || !Number.isInteger(serie.pesoGramos) || serie.pesoGramos! < 0)) {
      throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Cada serie de un ejercicio de peso necesita su peso.');
    }
    if (tipo === 'calistenia' && tienePeso) {
      throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Las series de calistenia no llevan peso.');
    }
  }
}
