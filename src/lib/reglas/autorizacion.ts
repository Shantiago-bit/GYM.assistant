import { MAX_REENVIOS_TUTOR_DIA } from '@/lib/config/gym';

// Reglas puras de la autorización de tutores (menores de EDAD_MINIMA_SIN_AUTORIZACION).

export type EstadoEnlace = 'vigente' | 'usado' | 'vencido';

// Un enlace respondido ya no sirve; uno vencido (o reemplazado por un reenvío) tampoco.
export function estadoEnlace(enlace: { respondida: boolean; vencida: boolean }): EstadoEnlace {
  if (enlace.respondida) return 'usado';
  if (enlace.vencida) return 'vencido';
  return 'vigente';
}

export function reenviosRestantes(reenviosHoy: number): number {
  return Math.max(0, MAX_REENVIOS_TUTOR_DIA - reenviosHoy);
}

// Muestra el correo del tutor sin revelarlo completo: "mama.perez@gmail.com" → "ma********@gmail.com".
export function enmascararCorreo(correo: string): string {
  const [usuario = '', dominio = ''] = correo.split('@');
  if (!dominio) return '***';
  const visible = usuario.slice(0, Math.min(2, Math.max(1, usuario.length - 1)));
  return `${visible}${'*'.repeat(Math.max(3, usuario.length - visible.length))}@${dominio}`;
}

const FORMATO_DIA = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'UTC' });

// "2026-11-18" → "18 de noviembre de 2026".
export function fechaLarga(dia: string): string {
  return FORMATO_DIA.format(new Date(`${dia}T00:00:00Z`));
}
