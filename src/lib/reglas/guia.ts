import { TEXTOS_PASOS, type IdPaso } from '@/lib/guia/contenido';

// Datos ya consultados de la cuenta. Ver la página de resumen no se registra, así que no es un paso.
export interface DatosPrimerosPasos {
  ejercicios: number;
  conPruebaInicial: boolean;
  sesiones: number; // sin contar las pruebas iniciales
  maxSesionesPorEjercicio: number;
  entrenamientoConVarios: boolean; // algún día con sesiones de dos o más ejercicios
  usoChat: boolean;
}

export interface PasoGuia {
  id: IdPaso;
  titulo: string;
  descripcion: string;
  href: string;
  hecho: boolean;
}

export interface PrimerosPasos {
  pasos: PasoGuia[];
  completados: number;
  total: number;
  porcentaje: number;
  siguiente: PasoGuia | null;
  todosHechos: boolean;
}

const ORDEN: IdPaso[] = [
  'crear_ejercicio',
  'prueba_inicial',
  'primera_sesion',
  'recomendacion',
  'entrenamiento_hoy',
  'preguntar_chrono',
];

function estaHecho(id: IdPaso, d: DatosPrimerosPasos): boolean {
  switch (id) {
    case 'crear_ejercicio':
      return d.ejercicios > 0;
    case 'prueba_inicial':
      return d.conPruebaInicial;
    case 'primera_sesion':
      return d.sesiones > 0;
    case 'recomendacion':
      // Una segunda sesión del mismo ejercicio indica que se volvió a entrenar siguiendo la recomendación.
      return d.maxSesionesPorEjercicio >= 2;
    case 'entrenamiento_hoy':
      return d.entrenamientoConVarios;
    case 'preguntar_chrono':
      return d.usoChat;
  }
}

export function calcularPrimerosPasos(d: DatosPrimerosPasos): PrimerosPasos {
  const pasos = ORDEN.map((id) => ({ id, ...TEXTOS_PASOS[id], hecho: estaHecho(id, d) }));
  const completados = pasos.filter((paso) => paso.hecho).length;
  return {
    pasos,
    completados,
    total: pasos.length,
    porcentaje: Math.round((completados / pasos.length) * 100),
    siguiente: pasos.find((paso) => !paso.hecho) ?? null,
    todosHechos: completados === pasos.length,
  };
}
