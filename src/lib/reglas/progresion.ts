import {
  INCREMENTO_PESO_ALTO_GRAMOS,
  INCREMENTO_PESO_GRAMOS,
  REDUCCION_DESCARGA,
  RIR_SALTO_DOBLE,
  UMBRAL_PESO_ALTO_GRAMOS,
} from '@/lib/config/gym';
import { formatearPeso } from '@/lib/formato';
import type { TipoEjercicio } from '@/lib/reglas/ejercicio';
import { indicesClave, reducirPeso, seriesClave, type Metodo } from '@/lib/reglas/metodos';
import { seriesEfectivas, volumenSerie, type Extra, type TipoSerie } from '@/lib/reglas/tecnicas';

export type AccionProgresion = 'subir_peso' | 'subir_reps' | 'mantener' | 'subir_variante' | 'bajar_peso';

// Una prueba que se tuvo en cuenta para decidir: una serie clave, el RIR o la sesión anterior.
export interface Evidencia {
  etiqueta: string;
  valor: string;
  cumple: boolean;
}

// El porqué de una recomendación, en lenguaje claro. Se calcula con los mismos datos que la decisión
// (explicarRecomendacion) y no cambia la acción ni los números.
export interface PorqueRecomendacion {
  resumen: string;
  evidencias: Evidencia[];
  regla: string;
  siNoCambias?: string;
}

export interface Recomendacion {
  accion: AccionProgresion;
  pesoSugeridoGramos: number | null;
  metaRepsSugerida: number;
  mensaje: string;
  porque: PorqueRecomendacion;
}

type Decision = Omit<Recomendacion, 'porque'>;

export interface DatosProgresion {
  tipo: TipoEjercicio;
  rango: [number, number];
  pesoActualGramos: number | null;
  metaRepsActual: number;
  repsPorSerie: number[];
  rirPorSerie?: (number | null)[];
  repsSesionAnterior?: number[];
  metodo?: Metodo;
  // Peso usado en cada serie de la última sesión, en el mismo orden que repsPorSerie.
  pesosPorSerie?: (number | null)[];
}

// Doble progresión: la meta se cumple cuando todas las series evaluadas llegan al tope del rango.
// every() es true con un arreglo vacío: sin series no hay nada que evaluar.
export function alcanzoTope(rango: [number, number], repsPorSerie: number[]): boolean {
  return repsPorSerie.length > 0 && repsPorSerie.every((valor) => valor >= rango[1]);
}

// RN-06: 2,5 kg por defecto; 5 kg cuando la carga ya es alta (salto real de discos y mancuernas).
export function incrementoPeso(pesoActualGramos: number): number {
  return pesoActualGramos >= UMBRAL_PESO_ALTO_GRAMOS ? INCREMENTO_PESO_ALTO_GRAMOS : INCREMENTO_PESO_GRAMOS;
}

// Salto doble solo si se anotó el RIR de todas las series evaluadas y en todas sobraban al menos 3.
export function sobraronRepeticiones(rirPorSerie: (number | null | undefined)[] | undefined): boolean {
  return (
    rirPorSerie !== undefined &&
    rirPorSerie.length > 0 &&
    rirPorSerie.every((rir) => typeof rir === 'number' && rir >= RIR_SALTO_DOBLE)
  );
}

// Descarga: un 10 % menos, redondeado a 0,5 kg hacia abajo.
export function pesoDeDescarga(pesoActualGramos: number): number {
  return reducirPeso(pesoActualGramos, REDUCCION_DESCARGA);
}

// Con una sola serie clave, los mensajes hablan de ella y no de "todas las series".
export function dondeSeEvalua(metodo: Metodo): string {
  switch (metodo) {
    case 'principal_descarga':
      return 'en la serie principal';
    case 'piramide_invertida':
    case 'piramide_ascendente':
      return 'en la serie más pesada';
    case 'rectas':
    case 'cluster':
      return 'en todas las series';
  }
}

export function recomendarSiguiente(d: DatosProgresion): Recomendacion {
  const decision = decidirProgresion(d);
  return { ...decision, porque: explicarRecomendacion(d, decision) };
}

// La regla de progresión (RN-06 a RN-09). No cambia con el porqué: explicarRecomendacion solo la describe.
function decidirProgresion(d: DatosProgresion): Decision {
  const metodo = d.metodo ?? 'rectas';
  const [min, max] = d.rango;
  const reps = seriesClave(metodo, d.repsPorSerie);
  const rir = d.rirPorSerie === undefined ? undefined : seriesClave(metodo, d.rirPorSerie);
  const anterior = d.repsSesionAnterior === undefined ? [] : seriesClave(metodo, d.repsSesionAnterior);
  const donde = dondeSeEvalua(metodo);

  // Una serie clave solo cumple la meta si se hizo con el peso de referencia o más: llegar al tope
  // con menos peso (o con una serie de descarga, si se cambió de método) no justifica subir.
  const pesosClave = d.pesosPorSerie === undefined ? [] : seriesClave(metodo, d.pesosPorSerie);
  const conPesoCompleto =
    d.tipo !== 'peso' || pesosClave.every((peso) => (peso ?? 0) >= (d.pesoActualGramos ?? 0));

  const todasEnTope = alcanzoTope(d.rango, reps) && conPesoCompleto;
  const algunaFalla = reps.length === 0 || reps.some((valor) => valor < min);
  const anteriorFallo = anterior.length > 0 && anterior.some((valor) => valor < min);

  if (d.tipo === 'calistenia') {
    if (todasEnTope) {
      return {
        accion: 'subir_variante',
        pesoSugeridoGramos: null,
        metaRepsSugerida: min,
        mensaje: `Llegaste a ${max} repeticiones ${donde}. Prueba una variante más difícil y vuelve a ${min} repeticiones.`,
      };
    }
    if (algunaFalla) {
      return {
        accion: 'mantener',
        pesoSugeridoGramos: null,
        metaRepsSugerida: d.metaRepsActual,
        mensaje:
          reps.length > 0 && anteriorFallo
            ? 'Es la segunda sesión seguida bajo el mínimo. Considera una variante más fácil hasta recuperar el rango.'
            : `No alcanzaste el mínimo ${donde}. Mantén la variante y repite el objetivo.`,
      };
    }
    return {
      accion: 'subir_reps',
      pesoSugeridoGramos: null,
      metaRepsSugerida: max,
      mensaje: `Cumpliste el rango. Mantén la variante y apunta a ${max} repeticiones ${donde} la próxima vez.`,
    };
  }

  const pesoActual = d.pesoActualGramos ?? 0;

  if (todasEnTope) {
    const saltoDoble = sobraronRepeticiones(rir);
    const nuevoPeso = pesoActual + incrementoPeso(pesoActual) * (saltoDoble ? 2 : 1);
    return {
      accion: 'subir_peso',
      pesoSugeridoGramos: nuevoPeso,
      metaRepsSugerida: min,
      mensaje: saltoDoble
        ? `Llegaste a ${max} repeticiones con ${RIR_SALTO_DOBLE} o más en reserva ${donde}. Sube el doble, a ${formatearPeso(nuevoPeso)}, y vuelve a ${min} repeticiones.`
        : `Llegaste a ${max} repeticiones ${donde}. Sube el peso a ${formatearPeso(nuevoPeso)} y vuelve a ${min} repeticiones.`,
    };
  }
  if (algunaFalla && reps.length > 0 && anteriorFallo && pesoActual > 0) {
    const pesoBajo = pesoDeDescarga(pesoActual);
    return {
      accion: 'bajar_peso',
      pesoSugeridoGramos: pesoBajo,
      metaRepsSugerida: min,
      mensaje: `Es la segunda sesión seguida bajo el mínimo. Baja a ${formatearPeso(pesoBajo)} y vuelve a ${min} repeticiones para recuperar el rango.`,
    };
  }
  if (algunaFalla) {
    return {
      accion: 'mantener',
      pesoSugeridoGramos: pesoActual,
      metaRepsSugerida: d.metaRepsActual,
      mensaje: `No alcanzaste el mínimo ${donde}. Mantén ${formatearPeso(pesoActual)} y repite el objetivo.`,
    };
  }
  return {
    accion: 'subir_reps',
    pesoSugeridoGramos: pesoActual,
    metaRepsSugerida: max,
    mensaje: `Cumpliste el rango. Mantén ${formatearPeso(pesoActual)} y apunta a ${max} repeticiones ${donde} la próxima vez.`,
  };
}

// ---- El porqué de cada recomendación.

const RESERVA = 'repeticiones de reserva';

// "12 repeticiones" si todas son iguales; si no, "12, 11 y 10 repeticiones".
function textoReps(reps: number[]): string {
  if (reps.length === 0) return 'ninguna repetición';
  const iguales = reps.every((valor) => valor === reps[0]);
  if (iguales) return `${reps[0]} ${reps[0] === 1 ? 'repetición' : 'repeticiones'}`;
  return `${reps.slice(0, -1).join(', ')} y ${reps.at(-1)} repeticiones`;
}

function etiquetaSerie(metodo: Metodo, indice: number): string {
  switch (metodo) {
    case 'principal_descarga':
      return 'Serie principal';
    case 'piramide_invertida':
    case 'piramide_ascendente':
      return 'Serie más pesada';
    case 'rectas':
    case 'cluster':
      return `Serie ${indice + 1}`;
  }
}

// Calcula el porqué con los mismos datos que la decisión. Las evidencias: una por serie clave (¿llegó al tope
// del rango con el peso de referencia?), más el RIR y la sesión anterior cuando influyeron.
export function explicarRecomendacion(d: DatosProgresion, decision: Decision): PorqueRecomendacion {
  const metodo = d.metodo ?? 'rectas';
  const [min, max] = d.rango;
  const donde = dondeSeEvalua(metodo);
  const esPeso = d.tipo === 'peso';
  const pesoActual = d.pesoActualGramos ?? 0;
  const indices = indicesClave(metodo, d.repsPorSerie.length);
  const reps = indices.map((indice) => d.repsPorSerie[indice]!);
  const pesos = indices.map((indice) => d.pesosPorSerie?.[indice] ?? null);
  const rir = indices.map((indice) => d.rirPorSerie?.[indice] ?? null);
  const anterior = d.repsSesionAnterior === undefined ? [] : seriesClave(metodo, d.repsSesionAnterior);
  const conPesoCompleto = !esPeso || pesos.every((peso) => (peso ?? pesoActual) >= pesoActual);
  const saltoDoble = esPeso && decision.accion === 'subir_peso' && sobraronRepeticiones(rir);
  const anteriorFallo = anterior.length > 0 && anterior.some((valor) => valor < min);

  const evidencias: Evidencia[] = indices.map((indice, posicion) => {
    const peso = pesos[posicion] ?? null;
    const conPeso = esPeso && peso !== null ? ` con ${formatearPeso(peso)}` : '';
    return {
      etiqueta: etiquetaSerie(metodo, indice),
      valor: `${reps[posicion]} de ${max} repeticiones${conPeso}`,
      cumple: reps[posicion]! >= max && (!esPeso || (peso ?? pesoActual) >= pesoActual),
    };
  });
  if (esPeso && decision.accion === 'subir_peso' && rir.some((valor) => valor !== null)) {
    evidencias.push({
      etiqueta: 'Repeticiones que te quedaron en reserva',
      valor: rir.map((valor) => (valor === null ? 'sin anotar' : String(valor))).join(', '),
      cumple: saltoDoble,
    });
  }
  if ((decision.accion === 'mantener' || decision.accion === 'bajar_peso') && anterior.length > 0 && reps.length > 0) {
    evidencias.push({
      etiqueta: 'Sesión anterior',
      valor: `${textoReps(anterior)} (mínimo ${min})`,
      cumple: !anteriorFallo,
    });
  }

  const pesoTexto = formatearPeso(pesoActual);
  const nuevo = formatearPeso(decision.pesoSugeridoGramos ?? 0);
  const incremento = formatearPeso(incrementoPeso(pesoActual));
  const reglaDoble = esPeso
    ? `Doble progresión: primero sumas repeticiones hasta llegar a ${max} ${donde}; entonces subes el peso ${incremento} y vuelves a ${min} repeticiones.`
    : `Doble progresión con tu cuerpo: sumas repeticiones hasta llegar a ${max} ${donde}; entonces pasas a una versión más difícil y vuelves a ${min}.`;

  if (reps.length === 0) {
    return {
      resumen: 'Todavía no hay series que evaluar: repite el objetivo y anota tu sesión.',
      evidencias,
      regla: reglaDoble,
    };
  }

  switch (decision.accion) {
    case 'subir_peso':
      return saltoDoble
        ? {
            resumen: `Subes a ${nuevo} (el doble de lo normal) porque hiciste ${textoReps(reps)} ${donde} y te sobraron ${RIR_SALTO_DOBLE} o más ${RESERVA}: te sobró fuerza.`,
            evidencias,
            regla: `Salto doble: si llegas a ${max} repeticiones ${donde} con ${RIR_SALTO_DOBLE} o más ${RESERVA}, subes el doble (${formatearPeso(incrementoPeso(pesoActual) * 2)}) y vuelves a ${min}.`,
            siNoCambias: `Si te quedas en ${pesoTexto}, el peso ya no te exige: seguirás sumando repeticiones sin ganar más fuerza.`,
          }
        : {
            resumen: `Subes a ${nuevo} porque hiciste ${textoReps(reps)} ${donde}: llegaste al tope de tu rango (${min} a ${max}).`,
            evidencias,
            regla: reglaDoble,
            siNoCambias: `Si te quedas en ${pesoTexto}, seguirás sumando repeticiones, pero el músculo deja de recibir un reto nuevo.`,
          };
    case 'subir_variante':
      return {
        resumen: `Pasas a una versión más difícil porque hiciste ${textoReps(reps)} ${donde}: llegaste al tope de tu rango (${min} a ${max}).`,
        evidencias,
        regla: reglaDoble,
        siNoCambias: 'Si te quedas en la misma versión, el ejercicio se vuelve de aguantar más y no de ganar fuerza.',
      };
    case 'bajar_peso':
      return {
        resumen: `Bajas a ${nuevo} porque es la segunda sesión seguida por debajo de ${min} repeticiones ${donde}: una semana más suave te ayuda a recuperar el rango.`,
        evidencias,
        regla: `Descarga: tras dos sesiones seguidas por debajo del mínimo, bajas un ${Math.round(REDUCCION_DESCARGA * 100)} % y vuelves a ${min} repeticiones; desde ahí vuelves a subir.`,
        siNoCambias: `Si te quedas en ${pesoTexto}, lo más probable es que sigas por debajo del mínimo y acumules cansancio.`,
      };
    case 'mantener': {
      const objetivo = esPeso ? `Mantienes ${pesoTexto}` : 'Mantienes la misma versión';
      return anteriorFallo && !esPeso
        ? {
            resumen: `${objetivo}: es la segunda sesión seguida por debajo de ${min} repeticiones ${donde}. Si te cuesta, prueba una versión más fácil un tiempo.`,
            evidencias,
            regla: reglaDoble,
          }
        : {
            resumen: `${objetivo} porque no llegaste a ${min} repeticiones ${donde}: repite el objetivo antes de subir.`,
            evidencias,
            regla: reglaDoble,
          };
    }
    case 'subir_reps':
      if (!conPesoCompleto && alcanzoTope(d.rango, reps)) {
        return {
          resumen: `Mantienes ${pesoTexto} porque llegaste a ${max} repeticiones, pero con menos peso que tu referencia: para subir, hazlo con ${pesoTexto}.`,
          evidencias,
          regla: reglaDoble,
        };
      }
      return {
        resumen: `${esPeso ? `Mantienes ${pesoTexto}` : 'Mantienes la misma versión'} porque hiciste ${textoReps(reps)}: estás en tu rango, pero aún no llegas a ${max} ${donde}.`,
        evidencias,
        regla: reglaDoble,
      };
  }
}

// Resumen que la interfaz muestra al cumplir la meta de la doble progresión.
export interface LogroMeta {
  nombre: string;
  tipo: TipoEjercicio;
  rango: [number, number];
  series: { reps: number; pesoGramos: number | null }[];
  volumenGramos: number | null;
  pesoSiguienteGramos: number | null;
  incrementoGramos: number | null;
  metaRepsSiguiente: number;
  saltoDoble: boolean;
  metodo: Metodo;
}

// Se llama después de guardar: la recomendación y el peso de referencia ya reflejan la sesión nueva.
export function detectarLogro(d: {
  nombre: string;
  tipo: TipoEjercicio;
  rango: [number, number];
  pesoRefGramos: number | null;
  series: {
    reps: number;
    pesoGramos?: number | null;
    rir?: number | null;
    tipoSerie?: TipoSerie | null;
    extras?: Extra[] | null;
  }[];
  recomendacion: Recomendacion;
  metodo?: Metodo;
}): LogroMeta | null {
  const metodo = d.metodo ?? 'rectas';
  const subio = d.recomendacion.accion === 'subir_peso' || d.recomendacion.accion === 'subir_variante';
  const efectivas = seriesEfectivas(d.series);
  const clave = seriesClave(metodo, efectivas);

  if (!subio || !alcanzoTope(d.rango, clave.map((serie) => serie.reps))) {
    return null;
  }

  const series = efectivas.map((serie) => ({ reps: serie.reps, pesoGramos: serie.pesoGramos ?? null }));
  const esPeso = d.tipo === 'peso';
  const pesoSiguiente = esPeso ? d.recomendacion.pesoSugeridoGramos : null;

  return {
    nombre: d.nombre,
    tipo: d.tipo,
    rango: d.rango,
    series,
    // Incluye las mini series (rest-pause, myo-reps, drop set); excluye la aproximación.
    volumenGramos: esPeso ? efectivas.reduce((total, serie) => total + volumenSerie(serie), 0) : null,
    pesoSiguienteGramos: pesoSiguiente,
    incrementoGramos: pesoSiguiente === null ? null : pesoSiguiente - (d.pesoRefGramos ?? 0),
    metaRepsSiguiente: d.recomendacion.metaRepsSugerida,
    saltoDoble: esPeso && sobraronRepeticiones(clave.map((serie) => serie.rir ?? null)),
    metodo,
  };
}

// "Listo para subir" en el listado: la última sesión (sin aproximaciones) cumple la meta del método.
export function listoParaSubir(d: {
  tipo: TipoEjercicio;
  metodo: Metodo;
  rango: [number, number];
  pesoRefGramos: number | null;
  series: { reps: number; pesoGramos: number | null; tipoSerie?: TipoSerie | null }[];
}): boolean {
  const efectivas = seriesEfectivas(d.series);
  const { accion } = recomendarSiguiente({
    tipo: d.tipo,
    rango: d.rango,
    pesoActualGramos: d.pesoRefGramos,
    metaRepsActual: d.rango[1],
    repsPorSerie: efectivas.map((serie) => serie.reps),
    pesosPorSerie: efectivas.map((serie) => serie.pesoGramos),
    metodo: d.metodo,
  });
  return accion === 'subir_peso' || accion === 'subir_variante';
}

// Sección 8.1: el estado del ejercicio cambia solo cuando la sesión aplica la recomendación.
// En peso se aplica si las series clave usan el peso sugerido (las demás siguen el plan del método).
// En calistenia no hay peso con qué comprobarlo, así que registrar la sesión ya la aplica.
export function estadoTrasSesion(d: {
  tipo: TipoEjercicio;
  pesoActualGramos: number | null;
  metaRepsActual: number;
  recomendacion: Recomendacion;
  pesosDeLaSesion: (number | null)[];
  metodo?: Metodo;
}): { pesoRefGramos: number | null; metaReps: number } {
  const { recomendacion } = d;

  if (d.tipo === 'calistenia') {
    return { pesoRefGramos: null, metaReps: recomendacion.metaRepsSugerida };
  }

  const indices = indicesClave(d.metodo ?? 'rectas', d.pesosDeLaSesion.length);
  const aplicada =
    indices.length > 0 &&
    indices.every((indice) => d.pesosDeLaSesion[indice] === recomendacion.pesoSugeridoGramos);

  return aplicada
    ? { pesoRefGramos: recomendacion.pesoSugeridoGramos, metaReps: recomendacion.metaRepsSugerida }
    : { pesoRefGramos: d.pesoActualGramos, metaReps: d.metaRepsActual };
}
