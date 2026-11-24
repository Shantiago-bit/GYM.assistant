import { COOKIES_ANTERIORES } from '@/lib/almacenamiento';
// Niveles de movimiento de la app (preferencia "Animaciones" del perfil).
// - completas: todo el movimiento expresivo (llama, mancuerna, efectos de cursor, parallax). Valor por defecto.
// - suaves: el sistema de movimiento anterior, sin efectos de cursor, parallax ni ilustraciones en bucle.
// - minimas: solo desvanecimientos cortos.
// Si el sistema operativo pide reducir el movimiento, el nivel efectivo es "minimas" aunque se haya elegido otro.
export const NIVELES_ANIMACION = ['completas', 'suaves', 'minimas'] as const;
export type NivelAnimacion = (typeof NIVELES_ANIMACION)[number];
export const NIVEL_POR_DEFECTO: NivelAnimacion = 'completas';

// Cookies (no httpOnly: un script mínimo en el <head> las lee antes de pintar, sin parpadeo).
export const COOKIE_ANIMACION = 'kairos_animacion';
export const COOKIE_VIBRACION = 'kairos_vibracion';
export const UN_ANIO_SEGUNDOS = 60 * 60 * 24 * 365;

export const ETIQUETAS_NIVEL: Record<NivelAnimacion, { nombre: string; descripcion: string }> = {
  completas: { nombre: 'Completas', descripcion: 'La llama de tu racha, la mancuerna al registrar y efectos que siguen el cursor.' },
  suaves: { nombre: 'Suaves', descripcion: 'Transiciones breves, sin efectos de cursor ni ilustraciones en movimiento.' },
  minimas: { nombre: 'Mínimas', descripcion: 'Solo desvanecimientos cortos.' },
};

export function esNivelAnimacion(valor: unknown): valor is NivelAnimacion {
  return typeof valor === 'string' && (NIVELES_ANIMACION as readonly string[]).includes(valor);
}

export function leerNivel(valor: string | null | undefined): NivelAnimacion {
  return esNivelAnimacion(valor) ? valor : NIVEL_POR_DEFECTO;
}

export function nivelEfectivo(elegido: NivelAnimacion, sistemaReduce: boolean): NivelAnimacion {
  return sistemaReduce ? 'minimas' : elegido;
}

// Vibración breve al guardar una sesión y al lograr una meta: solo si está activada y el nivel no es "minimas".
export function vibrar(nivel: NivelAnimacion, activada: boolean, ms = 15): void {
  if (!activada || nivel === 'minimas') return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(ms);
  } catch {
    // Sin permiso: nada.
  }
}

// Script del <head> (src/app/layout.tsx): pone data-animacion (lo elegido), data-movimiento (lo efectivo) y
// data-vibracion en <html> antes del primer pintado, y los actualiza si cambia la preferencia del sistema.
export const SCRIPT_NIVEL = `(function(){try{var d=document.documentElement;function c(n){var m=document.cookie.match(new RegExp('(?:^|; )'+n+'=([^;]*)'));return m?decodeURIComponent(m[1]):null}function g(n,v){var x=c(n);if(x===null&&v){x=c(v);if(x!==null){document.cookie=n+'='+x+';path=/;max-age=31536000;samesite=lax';document.cookie=v+'=;path=/;max-age=0'}}return x}var e=g('${COOKIE_ANIMACION}','${COOKIES_ANTERIORES[COOKIE_ANIMACION]}');if(['completas','suaves','minimas'].indexOf(e)<0)e='completas';var q=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)');function a(){d.dataset.animacion=e;d.dataset.movimiento=q&&q.matches?'minimas':e;d.dataset.vibracion=g('${COOKIE_VIBRACION}','${COOKIES_ANTERIORES[COOKIE_VIBRACION]}')==='0'?'no':'si'}a();if(q&&q.addEventListener)q.addEventListener('change',function(){a();window.dispatchEvent(new Event('kairos:movimiento'))})}catch(x){}})();`;
