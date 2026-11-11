// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { enmascararCorreo, estadoEnlace, fechaLarga, reenviosRestantes } from '@/lib/reglas/autorizacion';

describe('autorización de tutores', () => {
  it('un enlace respondido está usado; uno vencido o reemplazado, vencido; si no, vigente', () => {
    expect(estadoEnlace({ respondida: true, vencida: true })).toBe('usado');
    expect(estadoEnlace({ respondida: false, vencida: true })).toBe('vencido');
    expect(estadoEnlace({ respondida: false, vencida: false })).toBe('vigente');
  });

  it('permite 3 reenvíos por día', () => {
    expect(reenviosRestantes(0)).toBe(3);
    expect(reenviosRestantes(2)).toBe(1);
    expect(reenviosRestantes(5)).toBe(0);
  });

  it('enmascara el correo del tutor', () => {
    expect(enmascararCorreo('mama.perez@gmail.com')).toBe('ma********@gmail.com');
    expect(enmascararCorreo('ab@x.co')).toBe('a***@x.co');
    expect(enmascararCorreo('sin-arroba')).toBe('***');
  });

  it('escribe la fecha límite en palabras', () => {
    expect(fechaLarga('2026-11-18')).toBe('18 de noviembre de 2026');
  });
});
