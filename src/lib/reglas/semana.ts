// "Tu semana": el resumen de la semana anterior que el inicio muestra desde cada lunes (hora de Bogotá). Se arma
// con REGLAS, no con IA: qué mejoró, qué se estancó y una sugerencia concreta. Fechas AAAA-MM-DD.
import { formatearPeso } from '@/lib/formato';
import { restarDias } from '@/lib/reglas/fechas';
import { inicioDeSemana, type MarcaSesion, type SesionInicio } from '@/lib/reglas/inicio';
import { esEfectiva } from '@/lib/reglas/tecnicas';

export interface MejoraSemana {
  ejercicioId: string;
  nombre: string;
  texto: string;
  record: boolean;
}

export interface EstancadoSemana {
  ejercicioId: string;
  nombre: string;
  sesiones: number;
}

export interface ResumenSemana {
  desde: string; // lunes de la semana anterior
  hasta: string; // domingo de la semana anterior
  sesiones: number;
  dias: number;
  mejoras: MejoraSemana[];
  estancados: EstancadoSemana[];
  sugerencia: string;
}

export const PREGUNTA_SEMANA = '¿Cómo me fue la semana pasada y qué hago esta semana?';
export const SESIONES_ESTANCADO = 2;

// La marca de una sesión: con peso, el mayor peso y las repeticiones con ese peso; con tu cuerpo, el máximo de
// repeticiones. Se comparan en ese orden.
interface Marca {
  peso: number;
  reps: number;
}

function marcaDeSesion(sesion: SesionInicio): Marca | null {
  const efectivas = sesion.series.filter(esEfectiva);
  if (efectivas.length === 0) return null;
  if (sesion.tipo === 'calistenia')
    return { peso: 0, reps: Math.max(...efectivas.map((serie) => serie.reps)) };
  const peso = Math.max(...efectivas.map((serie) => serie.pesoGramos ?? 0));
  const reps = Math.max(
    ...efectivas.filter((serie) => (serie.pesoGramos ?? 0) === peso).map((serie) => serie.reps),
  );
  return { peso, reps };
}

const comparar = (a: Marca, b: Marca) => a.peso - b.peso || a.reps - b.reps;

function mejor(marcas: Marca[]): Marca | null {
  return marcas.reduce<Marca | null>(
    (maxima, marca) => (maxima === null || comparar(marca, maxima) > 0 ? marca : maxima),
    null,
  );
}

function textoMarca(marca: Marca, tipo: SesionInicio['tipo']): string {
  return tipo === 'calistenia'
    ? `${marca.reps} repeticiones`
    : `${formatearPeso(marca.peso)} × ${marca.reps}`;
}

// Fecha del récord vigente de cada ejercicio, con las mismas reglas que el perfil y el "Último récord" (mayor peso
// y, ante el mismo peso, más repeticiones; con tu cuerpo, más repeticiones; un empate no es récord).
function fechasDeRecord(marcas: MarcaSesion[]): Map<string, string> {
  const vigentes = new Map<string, { marca: Marca; fecha: string }>();
  for (const fila of [...marcas].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const marca: Marca | null =
      fila.tipo === 'calistenia'
        ? fila.repsMax === null
          ? null
          : { peso: 0, reps: fila.repsMax }
        : fila.pesoMaxGramos === null
          ? null
          : { peso: fila.pesoMaxGramos, reps: fila.repsEnPesoMax ?? 0 };
    if (!marca) continue;
    const actual = vigentes.get(fila.ejercicioId);
    if (!actual || comparar(marca, actual.marca) > 0)
      vigentes.set(fila.ejercicioId, { marca, fecha: fila.fecha });
  }
  return new Map([...vigentes].map(([id, { fecha }]) => [id, fecha]));
}

export function resumenSemanaAnterior(d: {
  hoy: string;
  // De la más antigua a la más reciente (obtenerDatosInicio: desde hace 3 semanas más las 6 últimas de cada uno).
  sesiones: SesionInicio[];
  // Una fila por sesión de los ejercicios activos, de todo el historial.
  marcas: MarcaSesion[];
  // Ejercicios activos listos para subir (para la sugerencia).
  listos: { id: string; nombre: string }[];
  // Ids de los ejercicios activos: los archivados no cuentan como estancados.
  activos: string[];
  // Ids de los ejercicios cuya recomendación vigente es una semana más suave (bajar_peso): la sugerencia no la
  // contradice.
  enDescarga?: string[];
}): ResumenSemana | null {
  const lunes = inicioDeSemana(d.hoy);
  const desde = restarDias(lunes, 7);
  const hasta = restarDias(lunes, 1);
  const anteriores = d.sesiones.filter((sesion) => sesion.fecha < lunes);
  // Sin nada anotado antes de esta semana, no hay de qué hablar.
  if (anteriores.length === 0) return null;

  const deLaSemana = anteriores.filter((sesion) => sesion.fecha >= desde);
  const records = fechasDeRecord(d.marcas);
  const porEjercicio = new Map<string, SesionInicio[]>();
  for (const sesion of anteriores)
    porEjercicio.set(sesion.ejercicioId, [...(porEjercicio.get(sesion.ejercicioId) ?? []), sesion]);

  const mejoras: MejoraSemana[] = [];
  const estancados: EstancadoSemana[] = [];
  for (const [ejercicioId, sesiones] of porEjercicio) {
    const primera = sesiones[0]!;
    const enLaSemana = sesiones.filter((sesion) => sesion.fecha >= desde);
    const antes = sesiones.filter((sesion) => sesion.fecha < desde);
    const mejorSemana = mejor(
      enLaSemana.map(marcaDeSesion).filter((marca): marca is Marca => marca !== null),
    );
    // Para "mejoró": contra la última sesión antes de la semana (el récord se mira aparte, en todo el historial).
    const ultimaAntes = antes.at(-1);
    const mejorAntes = ultimaAntes ? marcaDeSesion(ultimaAntes) : null;
    const fechaRecord = records.get(ejercicioId);

    if (mejorSemana && fechaRecord && fechaRecord >= desde && fechaRecord <= hasta && mejorAntes) {
      mejoras.push({
        ejercicioId,
        nombre: primera.nombre,
        texto: `Récord: ${textoMarca(mejorSemana, primera.tipo)}`,
        record: true,
      });
    } else if (mejorSemana && mejorAntes && comparar(mejorSemana, mejorAntes) > 0) {
      const texto =
        mejorSemana.peso > mejorAntes.peso
          ? `Subiste a ${formatearPeso(mejorSemana.peso)}`
          : `+${mejorSemana.reps - mejorAntes.reps} ${mejorSemana.reps - mejorAntes.reps === 1 ? 'repetición' : 'repeticiones'}${
              primera.tipo === 'peso' ? ` con ${formatearPeso(mejorSemana.peso)}` : ''
            }`;
      mejoras.push({ ejercicioId, nombre: primera.nombre, texto, record: false });
    }

    // Estancado: las últimas 2 o más sesiones con la misma marca, y la última fue la semana pasada.
    if (d.activos.includes(ejercicioId) && enLaSemana.length > 0) {
      const marcas = sesiones.map(marcaDeSesion);
      const ultima = marcas.at(-1);
      let iguales = 0;
      for (let indice = marcas.length - 1; indice >= 0; indice--) {
        const marca = marcas[indice];
        if (!ultima || !marca || comparar(marca, ultima) !== 0) break;
        iguales += 1;
      }
      if (iguales >= SESIONES_ESTANCADO)
        estancados.push({ ejercicioId, nombre: primera.nombre, sesiones: iguales });
    }
  }

  const ordenar = <T extends { nombre: string }>(lista: T[]) =>
    lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  ordenar(mejoras).sort((a, b) => Number(b.record) - Number(a.record));
  ordenar(estancados).sort((a, b) => b.sesiones - a.sesiones);

  const estancado = estancados[0];
  const listo = d.listos[0];
  const sugerencia =
    estancado && d.enDescarga?.includes(estancado.ejercicioId)
      ? `En ${estancado.nombre}, que lleva ${estancado.sesiones} sesiones igual, toca una semana más suave: usa el peso que te indica la app y desde ahí vuelves a subir.`
      : estancado
        ? `En ${estancado.nombre}, que lleva ${estancado.sesiones} sesiones igual, intenta sumar 1 repetición en tu primera serie; si sigue igual 2 semanas más, una semana más suave puede ayudarte.`
        : listo
          ? `Esta semana te toca subir en ${listo.nombre}: mira su recomendación antes de entrenar.`
          : deLaSemana.length === 0
            ? 'La semana pasada no anotaste sesiones: esta semana empieza con una sesión corta de tus ejercicios principales.'
            : 'Sigue así: anota cada sesión y la app te dirá cuándo subir.';

  return {
    desde,
    hasta,
    sesiones: deLaSemana.length,
    dias: new Set(deLaSemana.map((sesion) => sesion.fecha)).size,
    mejoras,
    estancados,
    sugerencia,
  };
}

// La tarjeta sale desde el lunes y toda la semana, hasta que la persona la cierra (se guarda el lunes cerrado).
export function mostrarTarjetaSemana(hoy: string, semanaCerrada: string | null): boolean {
  return semanaCerrada !== inicioDeSemana(hoy);
}
