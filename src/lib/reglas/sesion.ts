import type { TipoEjercicio } from '@/lib/reglas/ejercicio';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { admiteExtras, esEfectiva, MAX_EXTRAS, type Extra, type TipoSerie } from '@/lib/reglas/tecnicas';

export interface SerieEntrada {
  reps: number;
  pesoGramos?: number | null;
  rir?: number | null;
  tipoSerie?: TipoSerie | null;
  extras?: Extra[] | null;
}

export function validarSesion(series: SerieEntrada[], tipo: TipoEjercicio): void {
  if (series.length === 0) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'La sesión necesita al menos una serie.');
  }
  if (!series.some(esEfectiva)) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Las series de aproximación no cuentan: agrega al menos una serie de trabajo.');
  }

  for (const serie of series) {
    if (!Number.isInteger(serie.reps) || serie.reps < 0) {
      throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Las repeticiones deben ser un entero mayor o igual a 0.');
    }

    const tipoSerie = serie.tipoSerie ?? 'normal';
    const extras = serie.extras ?? [];

    if (extras.length > 0 && !admiteExtras(tipoSerie)) {
      throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Solo rest-pause, myo-reps y drop set llevan mini series.');
    }
    if (extras.length > MAX_EXTRAS) {
      throw new ErrorDeNegocio('DATOS_INVALIDOS', `Una serie admite hasta ${MAX_EXTRAS} mini series.`);
    }
    for (const extra of extras) {
      if (!Number.isInteger(extra.reps) || extra.reps < 1) {
        throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Las mini series necesitan al menos una repetición.');
      }
      const extraConPeso = extra.pesoGramos !== null && extra.pesoGramos !== undefined;
      if (extraConPeso && (tipo !== 'peso' || tipoSerie !== 'drop_set')) {
        throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Solo las bajadas de un drop set con peso llevan su propio peso.');
      }
      if (extraConPeso && (!Number.isInteger(extra.pesoGramos) || extra.pesoGramos! < 0)) {
        throw new ErrorDeNegocio('DATOS_INVALIDOS', 'El peso de las bajadas no es válido.');
      }
    }
    if (tipoSerie === 'drop_set' && tipo === 'peso' && extras.some((extra) => extra.pesoGramos == null)) {
      throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Anota el peso de cada bajada del drop set.');
    }

    if (serie.rir !== null && serie.rir !== undefined) {
      if (!Number.isInteger(serie.rir) || serie.rir < 0 || serie.rir > 10) {
        throw new ErrorDeNegocio('DATOS_INVALIDOS', 'El RIR debe ser un entero entre 0 y 10.');
      }
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
