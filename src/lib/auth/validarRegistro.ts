import { createHash } from 'node:crypto';
import { EDAD_MINIMA_REGISTRO, EDAD_MINIMA_SIN_AUTORIZACION, MAX_INTENTOS_NOMBRE_OFENSIVO } from '@/lib/config/gym';
import { estaBloqueado, registrarIntentoOfensivo, type DatosPerfil } from '@/lib/dataService';
import { ErrorDeNegocio, MENSAJES } from '@/lib/reglas/errores';
import { hoyBogota } from '@/lib/reglas/fechas';
import { esNombreOfensivo } from '@/lib/reglas/nombres';
import { calcularEdad } from '@/lib/reglas/perfil';

// Clave de la conexión para contar intentos: hash de la IP con un secreto del servidor. La IP no se guarda
// ni se registra en logs.
export function claveConexion(request: Request): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'desconocida';
  const secreto = process.env.REGISTRO_SECRETO_IP || process.env.GYMLEAD_SUPABASE_SERVICE_ROLE_KEY || 'gym-assistant';
  return createHash('sha256').update(`${secreto}:${ip}`).digest('hex');
}

export async function exigirSinBloqueo(clave: string): Promise<void> {
  if (await estaBloqueado(clave)) {
    throw new ErrorDeNegocio('REGISTRO_BLOQUEADO');
  }
}

export const tieneNombreOfensivo = (datos: { nombre: string; apodo?: string | undefined }) =>
  esNombreOfensivo(datos.nombre) || (datos.apodo !== undefined && esNombreOfensivo(datos.apodo));

// Revisa nombre, apodo y edad. Cada nombre rechazado suma un intento a la conexión; al 5.º se cancela el
// registro y la conexión queda bloqueada. No se dice qué palabra se detectó.
export async function comprobarDatosDeRegistro(
  clave: string,
  datos: DatosPerfil,
): Promise<{ edad: number; requiereAutorizacion: boolean }> {
  if (tieneNombreOfensivo(datos)) {
    const intentos = await registrarIntentoOfensivo(clave);
    if (intentos >= MAX_INTENTOS_NOMBRE_OFENSIVO) {
      throw new ErrorDeNegocio('REGISTRO_BLOQUEADO');
    }
    throw new ErrorDeNegocio(
      'NOMBRE_NO_PERMITIDO',
      `${MENSAJES.NOMBRE_NO_PERMITIDO} (Intento ${intentos} de ${MAX_INTENTOS_NOMBRE_OFENSIVO})`,
      { intento: intentos, maximo: MAX_INTENTOS_NOMBRE_OFENSIVO },
    );
  }

  const edad = calcularEdad(datos.fechaNacimiento, hoyBogota());
  exigirEdadMinima(edad);
  return { edad, requiereAutorizacion: edad < EDAD_MINIMA_SIN_AUTORIZACION };
}

export function exigirEdadMinima(edad: number): void {
  if (edad < EDAD_MINIMA_REGISTRO) {
    throw new ErrorDeNegocio(
      'EDAD_INSUFICIENTE',
      `Necesitas al menos ${EDAD_MINIMA_REGISTRO} años para usar Gym Assistant.`,
    );
  }
}

// El correo del tutor es obligatorio para menores y no puede ser el mismo de la cuenta.
export function exigirCorreoTutor(correoTutor: string | undefined, correoCuenta: string): string {
  if (!correoTutor) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Escribe el correo de tu mamá, papá o tutor.');
  }
  if (correoTutor.trim().toLowerCase() === correoCuenta.trim().toLowerCase()) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'El correo de tu tutor debe ser distinto al tuyo.');
  }
  return correoTutor.trim().toLowerCase();
}
