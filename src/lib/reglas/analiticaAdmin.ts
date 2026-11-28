// Reglas de la sección Analítica del panel de administración: conversión, semanas, cohortes de retención y el
// embudo de activación. Funciones puras sobre cifras ya agregadas en SQL; el "hoy" llega por parámetro. Las
// definiciones están en Doc/PLAN_GYM.md, sección 22. Pruebas en tests/reglas/analiticaAdmin.test.ts.
//
// Fechas: todas son días de Bogotá en texto AAAA-MM-DD (las sesiones ya se guardan así; la creación de las
// cuentas se convierte a Bogotá en SQL antes de llegar aquí). La semana va de lunes a domingo, igual que la
// racha, la semana del inicio y las barras por semana del detalle de una persona.
import { aCsv } from '@/lib/reglas/admin';
import { restarDias } from '@/lib/reglas/fechas';
import { diaSemana } from '@/lib/reglas/racha';

const DIA_MS = 86_400_000;
const enteroNoNegativo = (valor: number) => (Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : 0);

// ---------- Conversión ----------

// De las personas registradas en el periodo, cuántas registraron su primera sesión. Como en variacion(): si no hay
// base (0 registradas) no hay porcentaje que mostrar, nunca un 0 % ni un NaN.
export type Conversion = { tipo: 'porcentaje'; porcentaje: number } | { tipo: 'sin_registros' };

export function conversion(registradas: number, conPrimeraSesion: number): Conversion {
  const base = enteroNoNegativo(registradas);
  if (base === 0) return { tipo: 'sin_registros' };
  // Más conversiones que registros no debería pasar (la consulta cuenta sobre las mismas cuentas); si pasa, 100 %.
  const convertidas = Math.min(enteroNoNegativo(conPrimeraSesion), base);
  return { tipo: 'porcentaje', porcentaje: Math.round((convertidas / base) * 100) };
}

export function textoConversion(c: Conversion): string {
  return c.tipo === 'sin_registros' ? 'Sin registros' : `${c.porcentaje.toLocaleString('es-CO')} %`;
}

// ---------- Semanas (lunes a domingo, Bogotá) ----------

// El lunes de la semana de `fecha`.
export function lunesDe(fecha: string): string {
  return restarDias(fecha, diaSemana(fecha) - 1);
}

// Cuántas semanas enteras hay entre la semana de `fecha` y la de `hoy`: 0 si es la misma semana (aunque `fecha` sea
// el lunes y hoy el domingo), 1 si fue la semana pasada. Negativo si `fecha` es de una semana futura.
export function semanasDesde(fecha: string, hoy: string): number {
  const desde = Date.parse(`${lunesDe(fecha)}T00:00:00Z`);
  const hasta = Date.parse(`${lunesDe(hoy)}T00:00:00Z`);
  return Math.round((hasta - desde) / (7 * DIA_MS));
}

// El lunes `n` semanas después del lunes de `fecha` (n puede ser negativo).
export function sumarSemanas(fecha: string, n: number): string {
  return restarDias(lunesDe(fecha), -7 * n);
}

// ---------- Periodo (semanas) ----------

// Cuántas semanas de cohortes muestra /admin/analitica. El embudo cuenta a las personas de esas mismas cohortes.
export const SEMANAS_ANALITICA = [8, 12] as const;
export type SemanasAnalitica = (typeof SEMANAS_ANALITICA)[number];
export const SEMANAS_ANALITICA_POR_DEFECTO: SemanasAnalitica = 8;

export function leerSemanasAnalitica(valor: string | string[] | undefined): SemanasAnalitica {
  const numero = Number(Array.isArray(valor) ? valor[0] : valor);
  return (SEMANAS_ANALITICA as readonly number[]).includes(numero) ? (numero as SemanasAnalitica) : SEMANAS_ANALITICA_POR_DEFECTO;
}

// El lunes de la cohorte más antigua: con 8 semanas y hoy en la semana del 23 de noviembre, el 5 de octubre.
export function primeraCohorte(hoy: string, semanas: number): string {
  return sumarSemanas(hoy, -(Math.max(1, Math.floor(semanas)) - 1));
}

// ---------- Retención por cohortes ----------

// Una fila de la consulta: la cohorte (el lunes de la semana en que se registraron), cuántas personas tiene y
// cuántas de ellas registraron al menos una sesión `semana` semanas después (1 = la semana siguiente). Las
// cohortes sin actividad llegan con semana null (LEFT JOIN).
export interface FilaCohorte {
  cohorte: string;
  registradas: number;
  semana: number | null;
  activas: number;
}

export type CeldaCohorte =
  // La semana todavía no empieza: no se muestra ningún valor (ni 0 %).
  | { semana: number; estado: 'futura' }
  // 'en_curso': la semana actual, que puede subir hasta el domingo. porcentaje null si la cohorte tiene 0 personas.
  | { semana: number; estado: 'en_curso' | 'cerrada'; activas: number; porcentaje: number | null };

export interface Cohorte {
  cohorte: string; // lunes de la semana de registro
  registradas: number;
  celdas: CeldaCohorte[]; // semanas 1 a `semanas`, en orden
}

// Matriz de retención: las últimas `semanas` cohortes (de la más antigua a la de esta semana) y, para cada una, el %
// de sus personas que registró al menos una sesión en cada una de las `semanas` semanas siguientes. Las celdas de
// semanas que aún no empiezan quedan como 'futura'. Se ignoran filas fuera de rango o con semana fuera de 1…semanas.
export function construirCohortes(filas: FilaCohorte[], hoy: string, semanas = 8): Cohorte[] {
  const cantidad = Math.max(1, Math.floor(semanas));
  const lunesHoy = lunesDe(hoy);
  const cohortes = Array.from({ length: cantidad }, (_, i) => sumarSemanas(lunesHoy, -(cantidad - 1 - i)));

  const registradas = new Map<string, number>();
  const activas = new Map<string, number>();
  for (const fila of filas) {
    const cohorte = lunesDe(fila.cohorte);
    registradas.set(cohorte, Math.max(registradas.get(cohorte) ?? 0, enteroNoNegativo(fila.registradas)));
    if (fila.semana !== null && Number.isInteger(fila.semana) && fila.semana >= 1 && fila.semana <= cantidad) {
      const clave = `${cohorte}|${fila.semana}`;
      activas.set(clave, (activas.get(clave) ?? 0) + enteroNoNegativo(fila.activas));
    }
  }

  return cohortes.map((cohorte) => {
    const total = registradas.get(cohorte) ?? 0;
    const celdas = Array.from({ length: cantidad }, (_, i): CeldaCohorte => {
      const semana = i + 1;
      const inicio = sumarSemanas(cohorte, semana);
      if (inicio > lunesHoy) return { semana, estado: 'futura' };
      const enSemana = Math.min(activas.get(`${cohorte}|${semana}`) ?? 0, total);
      return {
        semana,
        estado: inicio === lunesHoy ? 'en_curso' : 'cerrada',
        activas: enSemana,
        porcentaje: total === 0 ? null : Math.round((enSemana / total) * 100),
      };
    });
    return { cohorte, registradas: total, celdas };
  });
}

// Promedio de retención de cada semana siguiente, ponderado por el tamaño de las cohortes (solo celdas cerradas,
// para que la semana en curso no baje el promedio). null si ninguna cohorte tiene esa semana cerrada.
export function retencionPromedio(cohortes: Cohorte[], semanas = cohortes[0]?.celdas.length ?? 0): (number | null)[] {
  return Array.from({ length: semanas }, (_, i) => {
    let base = 0;
    let activas = 0;
    for (const cohorte of cohortes) {
      const celda = cohorte.celdas[i];
      if (celda && celda.estado === 'cerrada' && cohorte.registradas > 0) {
        base += cohorte.registradas;
        activas += celda.activas;
      }
    }
    return base === 0 ? null : Math.round((activas / base) * 100);
  });
}

// ---------- Embudo de activación ----------

export const PASOS_EMBUDO = ['registradas', 'confirmadas', 'conPerfil', 'primeraSesion', 'dosSemanas'] as const;
export type PasoEmbudo = (typeof PASOS_EMBUDO)[number];

export const TEXTO_PASO_EMBUDO: Record<PasoEmbudo, string> = {
  registradas: 'Se registraron',
  confirmadas: 'Confirmaron el correo',
  conPerfil: 'Completaron el perfil',
  primeraSesion: 'Registraron su primera sesión',
  dosSemanas: 'Entrenaron en 2 o más semanas',
};

export type DatosEmbudo = Record<PasoEmbudo, number>;

export interface FilaEmbudo {
  paso: PasoEmbudo;
  texto: string;
  cantidad: number;
  // Frente a las registradas y frente al paso anterior; null si la base es 0. Como mucho 100.
  delTotal: number | null;
  delAnterior: number | null;
}

const porcentajeDe = (parte: number, base: number) => (base === 0 ? null : Math.min(100, Math.round((parte / base) * 100)));

// registradas → confirmadas → con perfil → primera sesión → 2 o más semanas activas, todas sobre las mismas
// personas (las registradas en el periodo). Las cantidades se muestran tal cual llegan; solo los porcentajes se
// limitan a 100 por si un paso trae más que el anterior.
export function construirEmbudo(datos: DatosEmbudo): FilaEmbudo[] {
  const total = enteroNoNegativo(datos.registradas);
  return PASOS_EMBUDO.map((paso, i) => {
    const cantidad = enteroNoNegativo(datos[paso]);
    const anterior = i === 0 ? total : enteroNoNegativo(datos[PASOS_EMBUDO[i - 1]!]);
    return {
      paso,
      texto: TEXTO_PASO_EMBUDO[paso],
      cantidad,
      delTotal: porcentajeDe(cantidad, total),
      delAnterior: i === 0 ? null : porcentajeDe(cantidad, anterior),
    };
  });
}

// El paso donde más personas se pierden frente al anterior (el primero si empatan); null si nadie se pierde o no
// hay registros. Sirve para el texto "La mayor caída está en…".
export function mayorCaida(embudo: FilaEmbudo[]): { paso: PasoEmbudo; perdidas: number } | null {
  let peor: { paso: PasoEmbudo; perdidas: number } | null = null;
  for (let i = 1; i < embudo.length; i++) {
    const perdidas = Math.max(0, embudo[i - 1]!.cantidad - embudo[i]!.cantidad);
    if (perdidas > 0 && (!peor || perdidas > peor.perdidas)) peor = { paso: embudo[i]!.paso, perdidas };
  }
  return peor;
}

// ---------- Mapa de calor y exportación ----------

// Intensidad del color de una celda del mapa de calor, de 0 a 1 (0 % → 0, 100 % → 1). Las celdas futuras o sin
// porcentaje no llevan color. La página la usa para mezclar --color-primario con el fondo de la tarjeta; el texto
// cumple 4,5:1 con cualquier intensidad (tests/accesibilidad/contraste.test.ts).
export function intensidadCelda(celda: CeldaCohorte): number {
  if (celda.estado === 'futura' || celda.porcentaje === null) return 0;
  return Math.min(1, Math.max(0, celda.porcentaje / 100));
}

// CSV de Analítica: solo cifras y los lunes de cada cohorte. Nunca correos, nombres ni ids.
// Una fila por paso del embudo y, por cada cohorte, una con su tamaño (semana 0) y una por semana siguiente con
// dato (las futuras no van: no hay cifra que exportar).
export function csvAnalitica(datos: { embudo: FilaEmbudo[]; cohortes: Cohorte[] }): string {
  const vacio = (valor: number | null) => (valor === null ? '' : valor);
  return aCsv(
    ['seccion', 'paso_o_cohorte', 'semana', 'personas', 'porcentaje', 'estado'],
    [
      ...datos.embudo.map((fila) => ['embudo', fila.paso, '', fila.cantidad, vacio(fila.delTotal), '']),
      ...datos.cohortes.flatMap((cohorte) => [
        ['cohorte', cohorte.cohorte, 0, cohorte.registradas, '', 'registro'],
        ...cohorte.celdas.flatMap((celda) =>
          celda.estado === 'futura' ? [] : [['cohorte', cohorte.cohorte, celda.semana, celda.activas, vacio(celda.porcentaje), celda.estado]],
        ),
      ]),
    ],
  );
}
