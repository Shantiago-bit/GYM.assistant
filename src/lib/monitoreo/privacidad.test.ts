// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { limpiarEvento, limpiarMigaja, limpiarTexto, muestreoDeTrazas, OCULTO, sentryActivo } from './privacidad';

// Datos inventados con la forma de los reales.
const UUID = '3f2b8c1e-9d4a-4e7b-8c2d-1a2b3c4d5e6f';
const TOKEN = 'k7Hq2LmN9pRs4TuVwXyZ0aBcDeFgHiJkLmNoPqRs';
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJhLWRlLXBydWViYQ';

// Lo que nunca debe aparecer en nada que salga hacia Sentry.
const PROHIBIDOS = ['ana.perez@example.com', 'Ana Pérez', 'Anita', '2012-05-14', 'quiero bajar de peso', TOKEN, JWT, 'abc123hash'];

function sinDatosPersonales(valor: unknown) {
  const texto = JSON.stringify(valor);
  for (const prohibido of PROHIBIDOS) expect(texto, prohibido).not.toContain(prohibido);
}

describe('limpiarTexto', () => {
  it('oculta correos, fechas, tokens de rutas y parámetros, JWT y valores de Postgres', () => {
    expect(limpiarTexto('No se pudo enviar a ana.perez@example.com')).toBe(`No se pudo enviar a ${OCULTO}`);
    expect(limpiarTexto('fecha_nacimiento inválida: 2012-05-14')).toBe(`fecha_nacimiento inválida: ${OCULTO}`);
    expect(limpiarTexto(`GET /autorizar/${TOKEN}`)).toBe(`GET /autorizar/${OCULTO}`);
    expect(limpiarTexto('/auth/confirmar?token_hash=abc123hash&type=signup')).toBe(`/auth/confirmar?token_hash=${OCULTO}&type=signup`);
    expect(limpiarTexto('/restablecer-contrasena?code=abc123hash')).toBe(`/restablecer-contrasena?code=${OCULTO}`);
    expect(limpiarTexto('https://app.example.com/#access_token=abc123hash&type=recovery')).toBe(
      `https://app.example.com/#access_token=${OCULTO}&type=recovery`,
    );
    expect(limpiarTexto(`Authorization: Bearer ${JWT}`)).toBe(`Authorization: Bearer ${OCULTO}`);
    expect(limpiarTexto('Key (nombre, usuario_id)=(Ana Pérez, x) already exists')).toBe(`Key (nombre, usuario_id)=(${OCULTO}) already exists`);
  });

  it('conserva los ids internos (UUID) y la máscara del registro de correos', () => {
    expect(limpiarTexto(`usuario ${UUID}`)).toBe(`usuario ${UUID}`);
    expect(limpiarTexto('destinatario d•••••7@gmail.com')).toBe('destinatario d•••••7@gmail.com');
  });
});

describe('limpiarEvento (eventos de ejemplo)', () => {
  it('error del servidor con solicitud, usuario, extra y migas', () => {
    const evento = {
      event_id: 'e1',
      message: 'Fallo al registrar a ana.perez@example.com',
      exception: {
        values: [
          {
            type: 'Error',
            value: 'duplicate key: Key (apodo)=(Anita) already exists',
            stacktrace: { frames: [{ filename: 'app/api/route.js', vars: { correo: 'ana.perez@example.com', intento: 2 } }] },
          },
        ],
      },
      request: {
        url: `https://gym.example.com/autorizar/${TOKEN}`,
        method: 'POST',
        query_string: 'token_hash=abc123hash&type=signup',
        data: { nombre: 'Ana Pérez', apodo: 'Anita', fechaNacimiento: '2012-05-14', mensaje: 'quiero bajar de peso' },
        cookies: { 'sb-access-token': JWT },
        headers: { 'content-type': 'application/json', cookie: `sb=${JWT}`, authorization: `Bearer ${JWT}`, 'x-forwarded-for': '200.1.2.3' },
      },
      user: { id: UUID, email: 'ana.perez@example.com', username: 'Anita', ip_address: '200.1.2.3' },
      extra: { para: 'ana.perez@example.com', nombre: 'Ana Pérez', tipo: 'confirmacion', destinatario_mascara: 'a•••••z@example.com' },
      tags: { servicio: 'correo' },
      contexts: { os: { name: 'Linux' }, runtime: { name: 'node', version: 'v22' } },
      breadcrumbs: [
        { category: 'fetch', data: { url: `/api/autorizar/${TOKEN}`, method: 'POST', status_code: 500 } },
        { category: 'console', message: 'Hola Anita, tu cumpleaños es 2012-05-14', data: { arguments: ['ana.perez@example.com'] } },
        { category: 'ui.input', message: 'input[name="mensaje"]', data: { mensaje: 'quiero bajar de peso' } },
      ],
    };

    const limpio = limpiarEvento(evento);
    sinDatosPersonales(limpio);
    expect(limpio.user).toEqual({ id: UUID });
    expect(limpio.request).not.toHaveProperty('data');
    expect(limpio.request).not.toHaveProperty('cookies');
    expect(limpio.request.headers).toEqual({ 'content-type': 'application/json' });
    expect(limpio.request.url).toBe(`https://gym.example.com/autorizar/${OCULTO}`);
    expect(limpio.request.query_string).toBe(`token_hash=${OCULTO}&type=signup`);
    expect(limpio.extra).toMatchObject({ para: OCULTO, nombre: OCULTO, tipo: 'confirmacion', destinatario_mascara: 'a•••••z@example.com' });
    // Lo técnico se conserva para diagnosticar.
    expect(limpio.exception.values[0]!.type).toBe('Error');
    expect(limpio.contexts).toEqual({ os: { name: 'Linux' }, runtime: { name: 'node', version: 'v22' } });
    expect(limpio.breadcrumbs[0]!.data).toMatchObject({ method: 'POST', status_code: 500 });
    // El original no se modifica.
    expect(evento.user.email).toBe('ana.perez@example.com');
  });

  it('error del navegador en /auth/confirmar y una transacción con tramos', () => {
    const cliente = limpiarEvento({
      transaction: '/auth/confirmar?token_hash=abc123hash',
      request: { url: 'https://gym.example.com/auth/confirmar?token_hash=abc123hash&type=signup' },
      logentry: { message: 'Hola %s', params: ['Anita'] },
      spans: [{ description: `GET https://api.example.com/autorizar/${TOKEN}`, data: { 'http.query': '?token=abc123hash', correo: 'ana.perez@example.com' } }],
    });
    sinDatosPersonales(cliente);
    expect(cliente.logentry).toEqual({ message: 'Hola %s', params: [OCULTO] });
    expect(cliente).not.toHaveProperty('user');
  });

  it('una miga de navegación pierde el token y conserva la ruta', () => {
    const migaja = limpiarMigaja({ category: 'navigation', data: { from: '/login', to: `/autorizar/${TOKEN}` } });
    expect(migaja).toEqual({ category: 'navigation', data: { from: '/login', to: `/autorizar/${OCULTO}` } });
  });
});

describe('activación y muestreo', () => {
  it('solo con DSN y en producción o vista previa; nunca en desarrollo ni en pruebas', () => {
    expect(sentryActivo({ dsn: 'https://clave@o1.ingest.sentry.io/1', vercelEnv: 'production', nodeEnv: 'production' })).toBe(true);
    expect(sentryActivo({ dsn: 'https://clave@o1.ingest.sentry.io/1', vercelEnv: 'preview', nodeEnv: 'production' })).toBe(true);
    expect(sentryActivo({ dsn: '', vercelEnv: 'production', nodeEnv: 'production' })).toBe(false);
    expect(sentryActivo({ dsn: undefined, vercelEnv: 'production', nodeEnv: 'production' })).toBe(false);
    expect(sentryActivo({ dsn: 'https://clave@o1.ingest.sentry.io/1', vercelEnv: 'development', nodeEnv: 'development' })).toBe(false);
    expect(sentryActivo({ dsn: 'https://clave@o1.ingest.sentry.io/1', vercelEnv: undefined, nodeEnv: 'production' })).toBe(false);
    expect(sentryActivo({ dsn: 'https://clave@o1.ingest.sentry.io/1', vercelEnv: 'production', nodeEnv: 'test' })).toBe(false);
  });

  it('el muestreo de trazas es bajo: 0,05 por defecto y como mucho 0,1', () => {
    expect(muestreoDeTrazas(undefined)).toBe(0.05);
    expect(muestreoDeTrazas('0.02')).toBe(0.02);
    expect(muestreoDeTrazas('0,1')).toBe(0.1);
    expect(muestreoDeTrazas('1')).toBe(0.1);
    expect(muestreoDeTrazas('-3')).toBe(0.05);
    expect(muestreoDeTrazas('mucho')).toBe(0.05);
  });
});
