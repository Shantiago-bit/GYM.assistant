import type { Enfoque, TipoEjercicio } from '@/lib/reglas/ejercicio';
import type { Metodo, PlanSerie } from '@/lib/reglas/metodos';
import type { LogroMeta, Recomendacion } from '@/lib/reglas/progresion';
import type { IndicadorProgreso, SerieMedida } from '@/lib/reglas/tendencia';

export type { Enfoque, TipoEjercicio } from '@/lib/reglas/ejercicio';
export type { Metodo, PlanSerie } from '@/lib/reglas/metodos';
export type { IndicadorProgreso, SerieMedida } from '@/lib/reglas/tendencia';
export type { AccionProgresion, LogroMeta, Recomendacion } from '@/lib/reglas/progresion';
export type { SerieEntrada } from '@/lib/reglas/sesion';

export interface FilaEjercicio {
  id: string;
  nombre: string;
  tipo: TipoEjercicio;
  enfoque: Enfoque;
  metodo: Metodo;
  rango: [number, number];
  pesoRefGramos: number | null;
  nivel: string | null;
  metaReps: number;
  archivado: boolean;
  totalSesiones: number;
  ultimaFecha: string | null;
}

// En el listado: la última sesión llegó al tope del rango en todas las series.
export interface EjercicioListado extends FilaEjercicio {
  listoParaSubir: boolean;
}

export interface Serie {
  numero: number;
  reps: number;
  pesoGramos: number | null;
  rir: number | null;
}

export interface Sesion {
  id: string;
  fecha: string;
  esPrueba: boolean;
  series: Serie[];
}

// Respuesta al registrar una sesión: logro es null si no se cumplió la meta del rango.
export interface SesionRegistrada extends Sesion {
  logro: LogroMeta | null;
}

export interface DetalleEjercicio {
  ejercicio: FilaEjercicio;
  tienePruebaInicial: boolean;
  sesiones: Sesion[];
  recomendacion: Recomendacion;
  // Peso y repeticiones por serie para la próxima sesión, según el método del ejercicio.
  plan: PlanSerie[];
}

export interface DatosEjercicio {
  nombre: string;
  tipo: TipoEjercicio;
  enfoque?: Enfoque | undefined;
  metodo?: Metodo | undefined;
  pesoRefKg?: number | undefined;
  nivel?: string | undefined;
  rangoMin?: number | undefined;
  rangoMax?: number | undefined;
}

// El peso entra en kilos y la capa de datos lo convierte a gramos (RN-11).
export interface SerieKg {
  reps: number;
  pesoKg?: number | undefined;
  rir?: number | undefined;
}

export interface DatosSesion {
  fecha?: string | undefined;
  series: SerieKg[];
}

export interface DatosEntrenamiento {
  fecha?: string | undefined;
  ejercicios: { ejercicioId: string; series: SerieKg[] }[];
}

export interface ResultadoEntrenamiento {
  ejercicioId: string;
  nombre: string;
  recomendacion: Recomendacion;
  logro: LogroMeta | null;
}

export interface ProgresoEjercicio {
  id: string;
  nombre: string;
  tipo: TipoEjercicio;
  sesiones: number;
  inicial: SerieMedida;
  final: SerieMedida;
  indicador: IndicadorProgreso;
}

export interface ResumenEntrenamiento {
  desde: string;
  hasta: string;
  totalSesiones: number;
  ejerciciosTrabajados: number;
  ejercicios: ProgresoEjercicio[];
}
