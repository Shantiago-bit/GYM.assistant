export type CodigoError =
  | 'DATOS_INVALIDOS'
  | 'NO_AUTORIZADO'
  | 'EJERCICIO_DUPLICADO'
  | 'EJERCICIO_ARCHIVADO'
  | 'EJERCICIO_NO_ENCONTRADO'
  | 'PRUEBA_YA_REGISTRADA'
  | 'PRUEBA_REQUERIDA'
  | 'TIENE_SESIONES'
  | 'LIMITE_CHAT'
  | 'CHAT_NO_CONFIGURADO'
  | 'NOMBRE_NO_PERMITIDO'
  | 'REGISTRO_BLOQUEADO'
  | 'EDAD_INSUFICIENTE'
  | 'AUTORIZACION_INVALIDA'
  | 'AUTORIZACION_USADA'
  | 'AUTORIZACION_VENCIDA'
  | 'REENVIOS_AGOTADOS'
  | 'PERFIL_EXISTENTE'
  | 'FOTO_NO_VALIDA'
  | 'FOTO_MUY_GRANDE'
  | 'CORREO_NO_ENVIADO'
  | 'AUTORIZACION_PENDIENTE'
  | 'PERFIL_INCOMPLETO'
  | 'ERROR_INTERNO';

export const MENSAJES: Record<CodigoError, string> = {
  DATOS_INVALIDOS: 'Revise los datos ingresados.',
  NO_AUTORIZADO: 'Debe iniciar sesión.',
  EJERCICIO_DUPLICADO: 'Ya existe un ejercicio con ese nombre.',
  EJERCICIO_ARCHIVADO: 'Ya tienes un ejercicio archivado con ese nombre. ¿Quieres restaurarlo?',
  EJERCICIO_NO_ENCONTRADO: 'El ejercicio no existe.',
  PRUEBA_YA_REGISTRADA: 'Este ejercicio ya tiene una prueba inicial.',
  PRUEBA_REQUERIDA: 'Registre la prueba inicial antes de la primera sesión.',
  TIENE_SESIONES: 'El ejercicio tiene sesiones registradas y no se puede eliminar; archívelo.',
  LIMITE_CHAT: 'Llegaste al límite de mensajes del chat por hoy. Vuelve mañana.',
  CHAT_NO_CONFIGURADO: 'El chat todavía no está disponible.',
  NOMBRE_NO_PERMITIDO: 'Ese nombre no está permitido. Elige otro, por favor.',
  REGISTRO_BLOQUEADO:
    'Se canceló la creación de la cuenta porque el nombre elegido no cumple las normas. Puedes volver a intentarlo en 30 minutos.',
  EDAD_INSUFICIENTE: 'No tienes la edad mínima para usar Gym Assistant.',
  AUTORIZACION_INVALIDA:
    'Este enlace no es válido. Puede que la solicitud ya se haya rechazado o que la cuenta se haya eliminado.',
  AUTORIZACION_USADA: 'Este enlace ya se usó: la solicitud ya tiene respuesta.',
  AUTORIZACION_VENCIDA:
    'Este enlace ya no es válido: venció o se envió uno más reciente. Revisa el último correo de Gym Assistant.',
  REENVIOS_AGOTADOS: 'Ya reenviaste la solicitud 3 veces hoy. Podrás hacerlo de nuevo mañana.',
  PERFIL_EXISTENTE: 'Tu perfil ya está completo.',
  FOTO_NO_VALIDA: 'La foto debe ser una imagen JPEG, PNG o WebP.',
  FOTO_MUY_GRANDE: 'La foto pesa demasiado.',
  CORREO_NO_ENVIADO: 'No se pudo enviar el correo de confirmación. Intenta de nuevo en unos minutos.',
  AUTORIZACION_PENDIENTE: 'Tu cuenta aún espera la autorización de tu mamá, papá o tutor.',
  PERFIL_INCOMPLETO: 'Completa tu perfil para continuar.',
  ERROR_INTERNO: 'Ocurrió un error inesperado. Intente de nuevo.',
};

export const ESTADO_HTTP: Record<CodigoError, number> = {
  DATOS_INVALIDOS: 400,
  NO_AUTORIZADO: 401,
  EJERCICIO_DUPLICADO: 409,
  EJERCICIO_ARCHIVADO: 409,
  EJERCICIO_NO_ENCONTRADO: 404,
  PRUEBA_YA_REGISTRADA: 409,
  PRUEBA_REQUERIDA: 409,
  TIENE_SESIONES: 409,
  LIMITE_CHAT: 429,
  CHAT_NO_CONFIGURADO: 503,
  NOMBRE_NO_PERMITIDO: 422,
  REGISTRO_BLOQUEADO: 429,
  EDAD_INSUFICIENTE: 403,
  AUTORIZACION_INVALIDA: 404,
  AUTORIZACION_USADA: 409,
  AUTORIZACION_VENCIDA: 410,
  REENVIOS_AGOTADOS: 429,
  PERFIL_EXISTENTE: 409,
  FOTO_NO_VALIDA: 400,
  FOTO_MUY_GRANDE: 413,
  CORREO_NO_ENVIADO: 502,
  AUTORIZACION_PENDIENTE: 403,
  PERFIL_INCOMPLETO: 409,
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
