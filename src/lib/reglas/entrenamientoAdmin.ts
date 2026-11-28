// Reglas de la sección Entrenamiento del panel de administración: normalización de nombres de ejercicio, umbral
// de anonimato y agrupaciones sobre cifras ya agregadas en SQL. Funciones puras. Pruebas en
// tests/reglas/entrenamientoAdmin.test.ts. Definición del umbral en Doc/PLAN_GYM.md, sección 22.
import { UMBRAL_ANONIMATO } from '@/lib/config/gym';

// ---------- Nombre normalizado ----------

// Letras con tilde (u otra marca) y su letra base. Es la única fuente de la equivalencia: normalizarNombreEjercicio
// la usa en JS y la consulta del ranking la pasa a translate() en SQL, así los dos lados agrupan igual (y no
// hace falta la extensión unaccent). Ya en minúsculas: se aplica después de lower().
export const LETRAS_CON_MARCA = 'áàäâãéèëêíìïîóòöôõúùüûñç';
export const LETRAS_BASE = 'aaaaaeeeeiiiiooooouuuunc';

const MAPA_LETRAS = new Map([...LETRAS_CON_MARCA].map((letra, i) => [letra, LETRAS_BASE[i]!]));

// "  Press   de BANCA inclinado " y "press de banca inclinado" son el mismo ejercicio: minúsculas, sin tildes y con
// los espacios colapsados. En SQL: btrim(regexp_replace(translate(lower(nombre), …), '\s+', ' ', 'g')).
export function normalizarNombreEjercicio(nombre: string): string {
  const minusculas = nombre.toLowerCase();
  let sinMarcas = '';
  for (const letra of minusculas) sinMarcas += MAPA_LETRAS.get(letra) ?? letra;
  return sinMarcas.replace(/\s+/g, ' ').trim();
}

// La misma normalización como expresión SQL sobre `columna`. $letras y $base son los parámetros con
// LETRAS_CON_MARCA y LETRAS_BASE (van como parámetros, no pegados en el texto de la consulta).
export function sqlNombreNormalizado(columna: string, parametroLetras: string, parametroBase: string): string {
  return `btrim(regexp_replace(translate(lower(${columna}), ${parametroLetras}, ${parametroBase}), '\\s+', ' ', 'g'))`;
}

// ---------- Umbral de anonimato ----------

// Solo quedan las filas que usan al menos `minimo` cuentas distintas. La consulta ya filtra con HAVING; esto es
// una segunda barrera por si una consulta futura olvida el HAVING (nunca debe llegar a la pantalla un ejercicio
// que identifique a una o dos personas).
export function aplicarUmbralAnonimato<T extends { cuentas: number }>(filas: T[], minimo: number = UMBRAL_ANONIMATO): T[] {
  return filas.filter((fila) => fila.cuentas >= minimo);
}

// ---------- Tipos de ejercicio ----------

export const TIPOS_EJERCICIO = ['peso', 'calistenia'] as const;
export type TipoEjercicio = (typeof TIPOS_EJERCICIO)[number];

export const TEXTO_TIPO_EJERCICIO: Record<TipoEjercicio, string> = {
  peso: 'Peso libre o máquina',
  calistenia: 'Calistenia',
};

export interface FilaTipoEstado {
  tipo: string;
  archivado: boolean;
  ejercicios: number;
}

export interface RepartoEjercicios {
  total: number;
  activos: number;
  archivados: number;
  porTipo: { tipo: TipoEjercicio; total: number; activos: number; archivados: number; porcentaje: number }[];
}

const porcentaje = (parte: number, total: number) => (total === 0 ? 0 : Math.round((parte / total) * 100));

// Reparto por tipo y estado a partir de una consulta GROUP BY tipo, archivado. Siempre trae los dos tipos (en 0
// si no hay ejercicios), en el orden de TIPOS_EJERCICIO.
export function repartirEjercicios(filas: FilaTipoEstado[]): RepartoEjercicios {
  const total = filas.reduce((suma, fila) => suma + fila.ejercicios, 0);
  const archivados = filas.filter((fila) => fila.archivado).reduce((suma, fila) => suma + fila.ejercicios, 0);
  return {
    total,
    activos: total - archivados,
    archivados,
    porTipo: TIPOS_EJERCICIO.map((tipo) => {
      const delTipo = filas.filter((fila) => fila.tipo === tipo);
      const totalTipo = delTipo.reduce((suma, fila) => suma + fila.ejercicios, 0);
      const archivadosTipo = delTipo.filter((fila) => fila.archivado).reduce((suma, fila) => suma + fila.ejercicios, 0);
      return { tipo, total: totalTipo, activos: totalTipo - archivadosTipo, archivados: archivadosTipo, porcentaje: porcentaje(totalTipo, total) };
    }),
  };
}

// ---------- Días de la semana y horas ----------

// ISO: 1 = lunes … 7 = domingo (igual que dias_entrenamiento y extract(isodow) en SQL).
export const NOMBRE_DIA_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const;
export const NOMBRE_DIA_CORTO = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'] as const;

export interface ConteoDia {
  dia: number; // 1 a 7
  sesiones: number;
}

export interface ConteoHora {
  hora: number; // 0 a 23, hora de Bogotá
  sesiones: number;
}

export function completarDiasSemana(filas: ConteoDia[]): ConteoDia[] {
  const porDia = new Map(filas.map((fila) => [fila.dia, fila.sesiones]));
  return Array.from({ length: 7 }, (_, i) => ({ dia: i + 1, sesiones: porDia.get(i + 1) ?? 0 }));
}

export function completarHoras(filas: ConteoHora[]): ConteoHora[] {
  const porHora = new Map(filas.map((fila) => [fila.hora, fila.sesiones]));
  return Array.from({ length: 24 }, (_, hora) => ({ hora, sesiones: porHora.get(hora) ?? 0 }));
}

// "18:00" para la hora 18.
export const etiquetaHora = (hora: number) => `${String(hora).padStart(2, '0')}:00`;

// El día o la hora con más sesiones (el primero si empatan); null si no hay ninguna sesión.
export function masFrecuente<T extends { sesiones: number }>(filas: T[]): T | null {
  return filas.reduce<T | null>((mejor, fila) => (fila.sesiones > 0 && (!mejor || fila.sesiones > mejor.sesiones) ? fila : mejor), null);
}

// ---------- Series por sesión ----------

// Promedio con un decimal; 0 si no hay sesiones (nunca NaN).
export function promedioSeriesPorSesion(series: number, sesiones: number): number {
  return sesiones === 0 ? 0 : Math.round((series / sesiones) * 10) / 10;
}

// ---------- Periodo ----------

export const PERIODOS_ENTRENAMIENTO = [30, 90, 365] as const;
export type PeriodoEntrenamiento = (typeof PERIODOS_ENTRENAMIENTO)[number];
export const PERIODO_ENTRENAMIENTO_POR_DEFECTO: PeriodoEntrenamiento = 90;

export const TEXTO_PERIODO_ENTRENAMIENTO: Record<PeriodoEntrenamiento, string> = {
  30: 'Últimos 30 días',
  90: 'Últimos 90 días',
  365: 'Último año',
};

export function leerPeriodoEntrenamiento(valor: string | string[] | undefined): PeriodoEntrenamiento {
  const numero = Number(Array.isArray(valor) ? valor[0] : valor);
  return (PERIODOS_ENTRENAMIENTO as readonly number[]).includes(numero)
    ? (numero as PeriodoEntrenamiento)
    : PERIODO_ENTRENAMIENTO_POR_DEFECTO;
}
