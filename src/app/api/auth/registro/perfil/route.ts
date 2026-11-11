import { claveConexion, comprobarDatosDeRegistro, exigirSinBloqueo } from '@/lib/auth/validarRegistro';
import { EDAD_MINIMA_SIN_AUTORIZACION } from '@/lib/config/gym';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { esquemaDatosPersonales, validarCon } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

// Paso 1 del registro: revisa nombre, apodo y edad antes de pedir el correo. No guarda nada personal;
// solo suma intentos (por hash de la conexión) cuando el nombre no está permitido.
export const POST = conManejoDeErrores(async (request: Request) => {
  const clave = claveConexion(request);
  await exigirSinBloqueo(clave);
  const datos = validarCon(esquemaDatosPersonales, await leerCuerpo(request));
  const { requiereAutorizacion } = await comprobarDatosDeRegistro(clave, datos);
  return responderOk({ requiereAutorizacion, edadMinimaSinAutorizacion: EDAD_MINIMA_SIN_AUTORIZACION });
});
