import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  ErrorDeNegocio,
  ESTADO_HTTP,
  MENSAJES,
  traducirErrorPostgres,
  type CodigoError,
} from '@/lib/reglas/errores';

const SIN_CACHE = { 'Cache-Control': 'no-store' };

export interface ContextoEjercicio {
  params: Promise<{ id: string }>;
}

function cuerpoDeError(codigo: CodigoError, mensaje: string, detalles: unknown, estado: number) {
  return NextResponse.json(
    { ok: false, error: { codigo, mensaje, detalles: detalles ?? null } },
    { status: estado, headers: SIN_CACHE },
  );
}

export function responderOk<T>(datos: T, estado = 200): NextResponse {
  return NextResponse.json({ ok: true, datos }, { status: estado, headers: SIN_CACHE });
}

export function responderError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return cuerpoDeError(
      'DATOS_INVALIDOS',
      MENSAJES.DATOS_INVALIDOS,
      error.flatten(),
      ESTADO_HTTP.DATOS_INVALIDOS,
    );
  }

  const deNegocio =
    error instanceof ErrorDeNegocio ? error : traducirErrorPostgres(error);

  if (deNegocio) {
    return cuerpoDeError(
      deNegocio.codigo,
      deNegocio.message,
      deNegocio.detalles,
      ESTADO_HTTP[deNegocio.codigo],
    );
  }

  console.error('Error interno en la API de Gym Assistant:', error);
  return cuerpoDeError('ERROR_INTERNO', MENSAJES.ERROR_INTERNO, null, ESTADO_HTTP.ERROR_INTERNO);
}

export function conManejoDeErrores<C>(
  manejador: (request: Request, contexto: C) => Promise<Response>,
): (request: Request, contexto: C) => Promise<Response> {
  return async (request, contexto) => {
    try {
      return await manejador(request, contexto);
    } catch (error) {
      return responderError(error);
    }
  };
}

export async function leerCuerpo(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'El cuerpo de la solicitud no es JSON válido.');
  }
}
