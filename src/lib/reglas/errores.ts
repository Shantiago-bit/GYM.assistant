export type CodigoError =
  | 'DATOS_INVALIDOS'
  | 'NO_AUTORIZADO'
  | 'EJERCICIO_DUPLICADO'
  | 'EJERCICIO_NO_ENCONTRADO'
  | 'PRUEBA_YA_REGISTRADA'
  | 'PRUEBA_REQUERIDA'
  | 'TIENE_SESIONES'
  | 'LIMITE_CHAT'
  | 'CHAT_NO_CONFIGURADO'
  | 'ERROR_INTERNO';

export const MENSAJES: Record<CodigoError, string> = {
  DATOS_INVALIDOS: 'Revise los datos ingresados.',
  NO_AUTORIZADO: 'Debe iniciar sesión.',
  EJERCICIO_DUPLICADO: 'Ya existe un ejercicio con ese nombre.',
  EJERCICIO_NO_ENCONTRADO: 'El ejercicio no existe.',
  PRUEBA_YA_REGISTRADA: 'Este ejercicio ya tiene una prueba inicial.',
  PRUEBA_REQUERIDA: 'Registre la prueba inicial antes de la primera sesión.',
  TIENE_SESIONES: 'El ejercicio tiene sesiones registradas y no se puede eliminar; archívelo.',
  LIMITE_CHAT: 'Llegaste al límite de mensajes del chat por hoy. Vuelve mañana.',
  CHAT_NO_CONFIGURADO: 'El chat todavía no está disponible.',
  ERROR_INTERNO: 'Ocurrió un error inesperado. Intente de nuevo.',
};

export const ESTADO_HTTP: Record<CodigoError, number> = {
  DATOS_INVALIDOS: 400,
  NO_AUTORIZADO: 401,
  EJERCICIO_DUPLICADO: 409,
  EJERCICIO_NO_ENCONTRADO: 404,
  PRUEBA_YA_REGISTRADA: 409,
  PRUEBA_REQUERIDA: 409,
  TIENE_SESIONES: 409,
  LIMITE_CHAT: 429,
  CHAT_NO_CONFIGURADO: 503,
  ERROR_INTERNO: 500,
};

export class ErrorDeNegocio extends Error {
  constructor(
    public codigo: CodigoError,
    mensaje?: string,
    public detalles?: unknown,
  ) {
    super(mensaje ?? MENSAJES[codigo]);
    this.name = 'ErrorDeNegocio';
  }
}

// Traduce un error de Postgres según la tabla 9.4 del plan. Devuelve null si no corresponde a ninguna fila.
export function traducirErrorPostgres(error: unknown): ErrorDeNegocio | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }

  const { code, constraint } = error as { code?: unknown; constraint?: unknown };

  if (code === '23505' && constraint === 'ux_ejercicios_nombre') {
    return new ErrorDeNegocio('EJERCICIO_DUPLICADO');
  }
  if (code === '23505' && constraint === 'ux_sesiones_prueba_por_ejercicio') {
    return new ErrorDeNegocio('PRUEBA_YA_REGISTRADA');
  }
  if (code === '23503') {
    return new ErrorDeNegocio('TIENE_SESIONES');
  }
  if (code === '23514') {
    return new ErrorDeNegocio('DATOS_INVALIDOS');
  }

  return null;
}
