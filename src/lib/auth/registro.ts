import type { EmailOtpType } from '@supabase/supabase-js';
import { enviarCorreo } from '@/lib/correo';
import { supabaseAdmin } from '@/lib/dataService';
import { ASUNTO_CONFIRMACION, plantillaConfirmacion } from '@/lib/plantillasCorreo';
import { obtenerUrlBase } from '@/lib/urlBase';

// La confirmación de cuentas nuevas la envía la app (con su plantilla y por Gmail), no Supabase:
// generateLink crea la cuenta y devuelve el token sin mandar correo, y /auth/confirmar lo canjea.

export type ResultadoRegistro = 'enviado' | 'existente' | 'reciente';

export class ErrorEnvioConfirmacion extends Error {}

// Entre dos reenvíos a una misma cuenta sin confirmar, para no gastar el cupo de correos.
const ESPERA_REENVIO_MS = 60_000;

export function enlaceDeConfirmacion(tokenHash: string, tipo: EmailOtpType): string {
  const parametros = new URLSearchParams({ token_hash: tokenHash, type: tipo });
  return `${obtenerUrlBase()}/auth/confirmar?${parametros.toString()}`;
}

async function enviarConfirmacion(correo: string, tokenHash: string, tipo: EmailOtpType): Promise<void> {
  const resultado = await enviarCorreo({
    para: correo,
    asunto: ASUNTO_CONFIRMACION,
    html: plantillaConfirmacion(enlaceDeConfirmacion(tokenHash, tipo)),
  });
  if (!resultado.ok) {
    throw new ErrorEnvioConfirmacion(resultado.error);
  }
}

function yaExiste(error: { code?: string | undefined; status?: number | undefined; message: string }): boolean {
  return error.code === 'email_exists' || error.code === 'user_already_exists' || error.status === 422;
}

async function buscarCuenta(correo: string) {
  const { data } = await supabaseAdmin.from('users').select('id').eq('email', correo).maybeSingle<{ id: string }>();
  if (!data) return null;
  const { data: cuenta } = await supabaseAdmin.auth.admin.getUserById(data.id);
  return cuenta.user;
}

// Crea la cuenta y envía la confirmación. Si el correo ya tenía una cuenta confirmada no se envía nada,
// y la respuesta a la persona es la misma, para no revelar qué correos están registrados.
export async function registrarCuenta(correoIngresado: string, contrasena: string): Promise<ResultadoRegistro> {
  const correo = correoIngresado.trim().toLowerCase();
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email: correo,
    password: contrasena,
    options: { data: { full_name: correo.split('@')[0] } },
  });

  if (!error) {
    await enviarConfirmacion(correo, data.properties.hashed_token, 'signup');
    return 'enviado';
  }
  if (!yaExiste(error)) {
    throw error;
  }

  // La cuenta existe. Si nunca se confirmó, se reenvía la confirmación (sin cambiar su contraseña,
  // para que nadie pueda fijarla antes que la dueña del correo).
  const cuenta = await buscarCuenta(correo);
  if (!cuenta || cuenta.email_confirmed_at) {
    return 'existente';
  }
  const ultimoCambio = Date.parse(cuenta.updated_at ?? cuenta.created_at);
  if (Number.isFinite(ultimoCambio) && Date.now() - ultimoCambio < ESPERA_REENVIO_MS) {
    return 'reciente';
  }
  const reenvio = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: correo });
  if (reenvio.error) {
    throw reenvio.error;
  }
  await enviarConfirmacion(correo, reenvio.data.properties.hashed_token, 'magiclink');
  return 'enviado';
}
