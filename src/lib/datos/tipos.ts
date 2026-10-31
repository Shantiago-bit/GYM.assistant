import type { TipoEjercicio } from '@/lib/reglas/ejercicio';
import type { Recomendacion } from '@/lib/reglas/progresion';
import type { IndicadorProgreso, SerieMedida } from '@/lib/reglas/tendencia';

export type { TipoEjercicio } from '@/lib/reglas/ejercicio';
export type { IndicadorProgreso, SerieMedida } from '@/lib/reglas/tendencia';
export type { AccionProgresion, Recomendacion } from '@/lib/reglas/progresion';
export type { SerieEntrada } from '@/lib/reglas/sesion';

export interface FilaEjercicio {
  id: string;
  nombre: string;
  tipo: TipoEjercicio;
  rango: [number, number];
  pesoRefGramos: number | null;
  nivel: string | null;
  metaReps: number;
  archivado: boolean;
  totalSesiones: number;
  ultimaFecha: string | null;
}

export interface Serie {
  numero: number;
  reps: number;
  pesoGramos: number | null;
}

export interface Sesion {
  id: string;
  fecha: string;
  esPrueba: boolean;
  series: Serie[];
}

export interface DetalleEjercicio {
  ejercicio: FilaEjercicio;
  tienePruebaInicial: boolean;
  sesiones: Sesion[];
  recomendacion: Recomendacion;
}

export interface DatosEjercicio {
  nombre: string;
  tipo: TipoEjercicio;
  pesoRefKg?: number | undefined;
  nivel?: string | undefined;
  rangoMin?: number | undefined;
  rangoMax?: number | undefined;
}

// El peso entra en kilos y la capa de datos lo convierte a gramos (RN-11).
export interface SerieKg {
  reps: number;
  pesoKg?: number | undefined;
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
