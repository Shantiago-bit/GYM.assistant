import { CHAT_LIMITE_DIARIO } from '@/lib/config/gym';

// Mensajes de CHRONO por cuenta y día. La variable CHAT_LIMITE_DIARIO lo cambia sin tocar el código.
export function limiteDiarioChat(): number {
  const valor = Number.parseInt(process.env.CHAT_LIMITE_DIARIO ?? '', 10);
  return Number.isInteger(valor) && valor >= 0 ? valor : CHAT_LIMITE_DIARIO;
}

export interface UsoChat {
  usados: number;
  limite: number;
}

// "N de 40 mensajes hoy": cuántos quedan y si ya toca avisar (5 o menos).
export function resumenUso({ usados, limite }: UsoChat) {
  const restantes = Math.max(0, limite - usados);
  return { restantes, agotado: restantes === 0, quedanPocos: restantes <= 5 };
}
