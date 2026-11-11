import { FRAGMENTOS, NOMBRES_PERMITIDOS, TERMINOS_BLOQUEADOS } from '@/lib/reglas/nombresBloqueados';

// Filtro de nombres y apodos ofensivos. Puro: no consulta la base ni registra nada.

// El 1 puede ser una i o una l; se prueban ambas lecturas.
const LEET_COMUN: Record<string, string> = { '4': 'a', '@': 'a', '3': 'e', '0': 'o', '5': 's', '$': 's', '7': 't', '!': 'i' };

function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Minúsculas, sin tildes, leetspeak traducido y solo letras: quita espacios, puntos, guiones y guiones bajos.
export function normalizarNombre(texto: string, unoComo: 'i' | 'l' = 'i'): string {
  return sinTildes(texto.toLowerCase())
    .replace(/[4@3057$!1]/g, (caracter) => (caracter === '1' ? unoComo : LEET_COMUN[caracter] ?? caracter))
    .replace(/[^a-z]/g, '');
}

// Cada letra del término puede repetirse: "puuuta" coincide con "puta", pero "pola" no coincide con "polla".
function patron(termino: string, completo: boolean): RegExp {
  const cuerpo = termino
    .split('')
    .map((letra) => `${letra}+`)
    .join('');
  return new RegExp(completo ? `^${cuerpo}$` : cuerpo);
}

const BLOQUEADOS = [...new Set(TERMINOS_BLOQUEADOS.map((termino) => normalizarNombre(termino)))].map((termino) =>
  patron(termino, true),
);
const FRAGMENTOS_PATRONES = FRAGMENTOS.map((fragmento) => patron(normalizarNombre(fragmento), false));
const PERMITIDOS = new Set(NOMBRES_PERMITIDOS.map((nombre) => normalizarNombre(nombre)));

function lecturas(texto: string): string[] {
  return [...new Set([normalizarNombre(texto, 'i'), normalizarNombre(texto, 'l')])].filter(Boolean);
}

const esPalabraBloqueada = (palabra: string) => BLOQUEADOS.some((bloqueado) => bloqueado.test(palabra));
const tieneFragmento = (texto: string) => FRAGMENTOS_PATRONES.some((fragmento) => fragmento.test(texto));

// true si el texto contiene un término ofensivo. Revisa cada palabra completa (los puntos, guiones y
// guiones bajos ya se quitan dentro de la palabra: "p.u.t.a") y, con el texto entero sin espacios, los
// fragmentos inequívocos ("malpa rido") y las letras sueltas ("p u t a").
export function esNombreOfensivo(texto: string): boolean {
  const palabras = texto
    .split(/\s+/)
    .filter((palabra) => normalizarNombre(palabra) !== '' && !lecturas(palabra).some((o) => PERMITIDOS.has(o)));

  if (palabras.some((palabra) => lecturas(palabra).some((o) => esPalabraBloqueada(o) || tieneFragmento(o)))) {
    return true;
  }

  const juntos = lecturas(palabras.join(''));
  // Solo se compara el texto entero como palabra si está partido en letras sueltas o pares; si no,
  // "Ana L" se leería como "anal".
  const letrasSueltas = palabras.length > 1 && palabras.every((palabra) => normalizarNombre(palabra).length <= 2);
  return juntos.some((junto) => tieneFragmento(junto) || (letrasSueltas && esPalabraBloqueada(junto)));
}
