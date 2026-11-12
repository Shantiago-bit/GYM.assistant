import type { EmailOtpType } from '@supabase/supabase-js';
import { ESPERA_REENVIO_SEGUNDOS } from '@/lib/config/gym';
import { enviarCorreo, registrarOmision } from '@/lib/correo';
import { crearPerfil, obtenerPerfil, supabaseAdmin, type DatosPerfil } from '@/lib/dataService';
import { ASUNTO_CONFIRMACION, plantillaConfirmacion } from '@/lib/plantillasCorreo';
import type { TipoCorreo } from '@/lib/reglas/correo';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { obtenerUrlBase } from '@/lib/urlBase';

// La confirmación de cuentas nuevas la envía la app (con su plantilla y por Gmail), no Supabase:
// generateLink crea la cuenta y devuelve el token sin mandar correo, y /auth/confirmar lo canjea.

export type ResultadoRegistro = 'enviado' | 'existente' | 'reciente';

export class ErrorEnvioConfirmacion extends Error {}

// Entre dos reenvíos a una misma cuenta sin confirmar, para no gastar el cupo de correos.
const ESPERA_REENVIO_MS = ESPERA_REENVIO_SEGUNDOS * 1000;

export function enlaceDeConfirmacion(tokenHash: string, tipo: EmailOtpType): string {
  const parametros = new URLSearchParams({ token_hash: tokenHash, type: tipo });
  return `${obtenerUrlBase()}/auth/confirmar?${parametros.toString()}`;
}

export async function enviarConfirmacion(
  correo: string,
  tokenHash: string,
  tipo: EmailOtpType,
  registro: { tipo: TipoCorreo; usuarioId: string },
): Promise<void> {
  const resultado = await enviarCorreo({
    para: correo,
    asunto: ASUNTO_CONFIRMACION,
    html: plantillaConfirmacion(enlaceDeConfirmacion(tokenHash, tipo)),
    tipo: registro.tipo,
    usuarioId: registro.usuarioId,
  });
  if (!resultado.ok) {
    throw new ErrorEnvioConfirmacion(resultado.error);
  }
}

type ErrorAuth = { code?: string | undefined; status?: number | undefined; message: string };

// Solo estos códigos significan que el correo ya tiene cuenta. Supabase también responde 422 cuando rechaza
// la dirección (email_address_invalid): antes eso se tomaba como cuenta existente y se mostraba éxito sin
// crear la cuenta ni enviar nada.
export function yaExiste(error: ErrorAuth): boolean {
  return error.code === 'email_exists' || error.code === 'user_already_exists';
}

// Errores de Supabase que la persona puede corregir; el resto se responde como error del servidor (nunca
// como "correo no válido", que queda solo para la validación del formato).
export function errorDeAlta(error: ErrorAuth): Error {
  if (error.code === 'email_address_invalid' || error.code === 'email_address_not_authorized') {
    return new ErrorDeNegocio(
      'DATOS_INVALIDOS',
      'No podemos usar ese correo para crear la cuenta. Revisa que esté bien escrito o prueba con otro.',
    );
  }
  if (error.code === 'weak_password') {
    return new ErrorDeNegocio('DATOS_INVALIDOS', 'La contraseña es demasiado débil. Prueba con una más larga o variada.');
  }
  return error instanceof Error ? error : new Error(error.message);
}

export async function buscarCuenta(correo: string) {
  const { data } = await supabaseAdmin.from('users').select('id').eq('email', correo).maybeSingle<{ id: string }>();
  if (!data) return null;
  const { data: cuenta } = await supabaseAdmin.auth.admin.getUserById(data.id);
  return cuenta.user;
}

// Crea la cuenta, su perfil y envía la confirmación. Si algo falla después de crear la cuenta, se borra,
// para que la persona pueda intentarlo de nuevo desde cero. Si el correo ya tenía una cuenta confirmada no
// se envía nada, y la respuesta es la misma, para no revelar qué correos están registrados.
export async function registrarCuenta(
  correoIngresado: string,
  contrasena: string,
  perfil: DatosPerfil,
): Promise<ResultadoRegistro> {
  const correo = correoIngresado.trim().toLowerCase();
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email: correo,
    password: contrasena,
    options: { data: { full_name: correo.split('@')[0] } },
  });

  if (!error) {
    try {
      await crearPerfil(data.user.id, perfil);
      await enviarConfirmacion(correo, data.properties.hashed_token, 'signup', { tipo: 'confirmacion', usuarioId: data.user.id });
    } catch (fallo) {
      await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => undefined);
      throw fallo;
    }
    return 'enviado';
  }
  if (!yaExiste(error)) {
    throw errorDeAlta(error);
  }

  // La cuenta existe: se reenvía la confirmación si corresponde (sin cambiar su contraseña ni su perfil,
  // para que nadie pueda fijarlos antes que la dueña del correo; si no tiene perfil, lo completará al entrar).
  return reenviarConfirmacion(correo);
}

// Respuesta de POST /api/auth/registro/reenviar: la misma pase lo que pase (no revela qué cuentas existen).
export const MENSAJE_REENVIO =
  'Si hay una cuenta pendiente de confirmar con ese correo, te enviamos un nuevo enlace. Revisa también Spam y Promociones.';

// Reenvía la confirmación a una cuenta existente sin confirmar, si las reglas lo permiten. Cuando una regla lo
// impide, queda registrado como 'omitido' con su motivo, y quien llama responde igual que si se hubiera enviado.
export async function reenviarConfirmacion(correoIngresado: string): Promise<ResultadoRegistro> {
  const correo = correoIngresado.trim().toLowerCase();
  const cuenta = await buscarCuenta(correo);
  if (!cuenta) {
    // Sin cuenta no hay a quién escribir: no se guarda nada que permita saber qué correos se probaron.
    return 'existente';
  }
  const omitir = async (motivo: 'cuenta_confirmada' | 'reenvio_reciente' | 'menor_pendiente' | 'menor_rechazado') => {
    await registrarOmision({ tipo: 'reenvio_confirmacion', para: correo, usuarioId: cuenta.id, motivo });
  };
  if (cuenta.email_confirmed_at) {
    await omitir('cuenta_confirmada');
    return 'existente';
  }
  // La cuenta de un menor que espera la autorización de su tutor no recibe la confirmación: llegará cuando
  // el tutor la autorice.
  const perfilExistente = await obtenerPerfil(cuenta.id);
  if (perfilExistente?.autorizacion === 'pendiente' || perfilExistente?.autorizacion === 'rechazada') {
    await omitir(perfilExistente.autorizacion === 'pendiente' ? 'menor_pendiente' : 'menor_rechazado');
    return 'existente';
  }
  const ultimoCambio = Date.parse(cuenta.updated_at ?? cuenta.created_at);
  if (Number.isFinite(ultimoCambio) && Date.now() - ultimoCambio < ESPERA_REENVIO_MS) {
    await omitir('reenvio_reciente');
    return 'reciente';
  }
  const reenvio = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: correo });
  if (reenvio.error) {
    throw reenvio.error;
  }
  await enviarConfirmacion(correo, reenvio.data.properties.hashed_token, 'magiclink', {
    tipo: 'reenvio_confirmacion',
    usuarioId: cuenta.id,
  });
  return 'enviado';
}
