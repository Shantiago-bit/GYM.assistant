// Claves que la app guarda en el navegador. Migración suave del nombre anterior: antes de llamarse Kairós, la app se
// llamó Agón y sus claves empezaban con "agon_". Al leer una clave nueva que no existe pero sí existe la anterior,
// se copia su valor a la nueva y se borra la anterior: así nadie vuelve a ver la intro del día, la insignia "Nuevo"
// del Museo ni el destello de la racha por el cambio de nombre. Este archivo es el único lugar con los nombres
// anteriores (tests/visual/nombre.test.ts lo permite).
export const CLAVES_ANTERIORES: Readonly<Record<string, string>> = {
  kairos_intro_dia: 'agon_intro_dia',
  kairos_museo_visto: 'agon_museo_visto',
  kairos_constelacion_vista: 'agon_constelacion_vista',
  kairos_racha_vista: 'agon_racha_vista',
};

// Las cookies del nivel de animación (las lee el script del <head>, que también las migra).
export const COOKIES_ANTERIORES: Readonly<Record<string, string>> = {
  kairos_animacion: 'agon_animacion',
  kairos_vibracion: 'agon_vibracion',
};

function almacenLocal(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

// Lee una clave de localStorage, migrando la anterior si hace falta. Sin almacenamiento (modo privado, sitio
// bloqueado), null.
export function leerLocal(clave: string, almacen: Storage | null = almacenLocal()): string | null {
  if (!almacen) return null;
  try {
    const valor = almacen.getItem(clave);
    if (valor !== null) return valor;
    const anterior = CLAVES_ANTERIORES[clave];
    if (!anterior) return null;
    const viejo = almacen.getItem(anterior);
    if (viejo === null) return null;
    almacen.setItem(clave, viejo);
    almacen.removeItem(anterior);
    return viejo;
  } catch {
    return null;
  }
}

// Guarda una clave; sin almacenamiento, no hace nada. Devuelve si se pudo.
export function guardarLocal(clave: string, valor: string, almacen: Storage | null = almacenLocal()): boolean {
  if (!almacen) return false;
  try {
    almacen.setItem(clave, valor);
    return true;
  } catch {
    return false;
  }
}
