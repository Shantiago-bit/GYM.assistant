// @vitest-environment node
import * as Sentry from '@sentry/nextjs';
import { describe, expect, it } from 'vitest';
import { opcionesSentry } from './opciones';
import { reportarAviso, reportarError } from './reportar';

const base = { nodeEnv: 'production', release: 'abc1234', muestreo: undefined };
const DSN = 'https://clave-publica@o1.ingest.sentry.io/1';

describe('opcionesSentry', () => {
  it('sin DSN (o en desarrollo) no hay opciones y no se inicia nada', () => {
    expect(opcionesSentry({ ...base, dsn: '', vercelEnv: 'production' })).toBeNull();
    expect(opcionesSentry({ ...base, dsn: undefined, vercelEnv: 'preview' })).toBeNull();
    expect(opcionesSentry({ ...base, dsn: DSN, vercelEnv: 'development' })).toBeNull();
  });

  it('en producción: sin datos personales, sin replay, muestreo bajo, release y entorno', () => {
    const opciones = opcionesSentry({ ...base, dsn: DSN, vercelEnv: 'production' })!;
    expect(opciones).toMatchObject({
      dsn: DSN,
      environment: 'production',
      release: 'abc1234',
      sendDefaultPii: false,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      tracesSampleRate: 0.05,
    });
    expect(opciones.dataCollection).toMatchObject({ userInfo: false, cookies: false, httpBodies: [], urlQueryParams: false });
    // Los filtros están conectados.
    const evento = opciones.beforeSend({ type: undefined, message: 'falló ana.perez@example.com', user: { id: 'u1', email: 'ana.perez@example.com' } });
    expect(JSON.stringify(evento)).not.toContain('ana.perez@example.com');
  });
});

describe('sin SENTRY_DSN la app funciona igual', () => {
  it('reportar no hace nada ni falla: no hay cliente de Sentry', () => {
    expect(Sentry.getClient()).toBeUndefined();
    expect(() => reportarError(new Error('prueba'))).not.toThrow();
    expect(() => reportarAviso('aviso', { tipo: 'prueba' })).not.toThrow();
    expect(Sentry.getClient()).toBeUndefined();
  });
});
