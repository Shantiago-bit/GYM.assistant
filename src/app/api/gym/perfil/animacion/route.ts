import { exigirSesion } from '@/lib/auth/sesion';
import { guardarPreferenciaAnimacion } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { COOKIE_ANIMACION, COOKIE_VIBRACION, UN_ANIO_SEGUNDOS } from '@/lib/reglas/animacion';
import { esquemaAnimacion, validarCon } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

// Guarda la preferencia "Animaciones" (nivel y vibración) de la cuenta de la sesión y la deja en cookies, que el
// script del <head> lee antes de pintar (sin parpadeo). No es un dato sensible: no son httpOnly.
export const POST = conManejoDeErrores(async (request: Request) => {
  const { id: usuarioId } = await exigirSesion();
  const { nivel, vibracion } = validarCon(esquemaAnimacion, await leerCuerpo(request));
  await guardarPreferenciaAnimacion(usuarioId, nivel, vibracion);
  const respuesta = responderOk({ nivel, vibracion });
  const opciones = { path: '/', maxAge: UN_ANIO_SEGUNDOS, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production' };
  respuesta.cookies.set(COOKIE_ANIMACION, nivel, opciones);
  respuesta.cookies.set(COOKIE_VIBRACION, vibracion ? '1' : '0', opciones);
  return respuesta;
});
