// Opciones de Sentry compartidas por el navegador, el servidor y el edge (sentry.*.config.ts e
// instrumentation-client.ts). Sin DSN, o fuera de producción y vistas previas, devuelve null y no se inicia nada.
import type { Breadcrumb, ErrorEvent, NodeOptions } from '@sentry/nextjs';
import {
  limpiarEvento,
  limpiarMigaja,
  muestreoDeTrazas,
  sentryActivo,
} from '@/lib/monitoreo/privacidad';

type EventoDeTransaccion = Parameters<NonNullable<NodeOptions['beforeSendTransaction']>>[0];

export interface EntornoSentry {
  dsn: string | undefined;
  vercelEnv: string | undefined;
  nodeEnv: string | undefined;
  release: string | undefined;
  muestreo: string | undefined;
}

export function opcionesSentry(entorno: EntornoSentry) {
  if (!sentryActivo(entorno)) return null;
  return {
    dsn: entorno.dsn!.trim(),
    environment: entorno.vercelEnv,
    ...(entorno.release ? { release: entorno.release } : {}),
    // Nada que identifique a la persona: ni IP, ni cookies, ni cabeceras, ni cuerpos de solicitudes o respuestas.
    sendDefaultPii: false,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: { allow: ['content-type', 'accept', 'user-agent'] },
        response: false,
      },
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      databaseQueryData: false,
      stackFrameVariables: false,
    },
    tracesSampleRate: muestreoDeTrazas(entorno.muestreo),
    // Sin Session Replay: no se graba la pantalla ni lo que se escribe en los formularios.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend: (evento: ErrorEvent) => limpiarEvento(evento),
    beforeSendTransaction: (evento: EventoDeTransaccion) => limpiarEvento(evento),
    beforeBreadcrumb: (migaja: Breadcrumb) => limpiarMigaja(migaja),
  };
}
