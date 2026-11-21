// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  dominioDelRemitente,
  esDominioPropio,
  falloGmailAntesDeAceptar,
  falloResendAntesDeAceptar,
  leerPreferenciaProveedor,
  ordenDeProveedores,
} from '@/lib/reglas/correo';

describe('CORREO_PROVEEDOR', () => {
  it("acepta 'gmail', 'resend' y 'auto'; cualquier otro valor es 'auto'", () => {
    expect(leerPreferenciaProveedor('gmail')).toBe('gmail');
    expect(leerPreferenciaProveedor(' Resend ')).toBe('resend');
    expect(leerPreferenciaProveedor('auto')).toBe('auto');
    expect(leerPreferenciaProveedor(undefined)).toBe('auto');
    expect(leerPreferenciaProveedor('sendgrid')).toBe('auto');
  });
});

describe('dominio del remitente de Resend', () => {
  it('lee el dominio con o sin nombre y distingue el remitente de prueba', () => {
    expect(dominioDelRemitente('Gym Assistant <no-responder@midominio.com>')).toBe('midominio.com');
    expect(dominioDelRemitente('no-responder@MiDominio.com')).toBe('midominio.com');
    expect(dominioDelRemitente('')).toBeNull();
    expect(esDominioPropio('Gym Assistant <no-responder@midominio.com>')).toBe(true);
    expect(esDominioPropio('onboarding@resend.dev')).toBe(false);
    expect(esDominioPropio('Gym <hola@algo.resend.dev>')).toBe(false);
    expect(esDominioPropio(undefined)).toBe(false);
  });
});

describe('orden de proveedores', () => {
  const con = (preferencia: 'auto' | 'gmail' | 'resend', gmailConfigurado: boolean, resendConDominioPropio: boolean) =>
    ordenDeProveedores({ preferencia, gmailConfigurado, resendConDominioPropio });

  it("'auto': Resend con dominio propio y Gmail de respaldo; si no, Gmail; sin nada, Resend como antes", () => {
    expect(con('auto', true, true)).toEqual(['resend', 'gmail']);
    expect(con('auto', false, true)).toEqual(['resend']);
    expect(con('auto', true, false)).toEqual(['gmail']);
    expect(con('auto', false, false)).toEqual(['resend']);
  });

  it("'gmail': primero Gmail; Resend solo de respaldo con dominio propio", () => {
    expect(con('gmail', true, true)).toEqual(['gmail', 'resend']);
    expect(con('gmail', true, false)).toEqual(['gmail']);
    expect(con('gmail', false, false)).toEqual(['gmail']);
  });

  it("'resend': primero Resend; Gmail de respaldo si está configurado", () => {
    expect(con('resend', true, true)).toEqual(['resend', 'gmail']);
    expect(con('resend', false, true)).toEqual(['resend']);
    expect(con('resend', true, false)).toEqual(['resend', 'gmail']);
  });
});

describe('¿falló antes de aceptar el correo?', () => {
  it('Gmail: autenticación o conexión sí; un error después de enviar, no', () => {
    expect(falloGmailAntesDeAceptar({ code: 'EAUTH', responseCode: 535 })).toBe(true);
    expect(falloGmailAntesDeAceptar({ code: 'ECONNECTION' })).toBe(true);
    expect(falloGmailAntesDeAceptar({ code: 'ETIMEDOUT' })).toBe(true);
    expect(falloGmailAntesDeAceptar({ responseCode: 535 })).toBe(true);
    expect(falloGmailAntesDeAceptar({ code: 'EMESSAGE', responseCode: 552 })).toBe(false);
    expect(falloGmailAntesDeAceptar({ code: 'EENVELOPE' })).toBe(false);
    expect(falloGmailAntesDeAceptar(new Error('desconocido'))).toBe(false);
    expect(falloGmailAntesDeAceptar(null)).toBe(false);
  });

  it('Resend: clave, permiso, dominio sin verificar o sin conexión sí; validación o cuota, no', () => {
    expect(falloResendAntesDeAceptar({ name: 'invalid_api_key', statusCode: 403 })).toBe(true);
    expect(falloResendAntesDeAceptar({ name: 'missing_api_key', statusCode: 401 })).toBe(true);
    expect(falloResendAntesDeAceptar({ name: 'validation_error', statusCode: 403 })).toBe(true);
    expect(falloResendAntesDeAceptar({ name: 'application_error', statusCode: null })).toBe(true);
    expect(falloResendAntesDeAceptar({ name: 'validation_error', statusCode: 422 })).toBe(false);
    expect(falloResendAntesDeAceptar({ name: 'daily_quota_exceeded', statusCode: 429 })).toBe(false);
    expect(falloResendAntesDeAceptar(null)).toBe(false);
  });
});
