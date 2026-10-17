import crypto from 'node:crypto';

export function generarToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function calcularHashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
