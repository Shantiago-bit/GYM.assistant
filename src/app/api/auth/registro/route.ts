import { ErrorEnvioConfirmacion, registrarCuenta } from '@/lib/auth/registro';
import {
  autorizacionNoDisponible,
  claveConexion,
  comprobarDatosDeRegistro,
  exigirSinBloqueo,
} from '@/lib/auth/validarRegistro';
import { reiniciarIntentos } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { esquemaRegistroCuenta, validarCon } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

// La misma respuesta para correos nuevos y ya registrados: no revela qué cuentas existen.
const MENSAJE = 'Si el correo es nuevo, recibirás un enlace para confirmar tu cuenta.';

// Paso 2 del registro. Vuelve a revisar todo lo del paso 1 (el cliente no es de fiar): el bloqueo, los
// nombres y la edad. Luego crea la cuenta y su perfil juntos.
export const POST = conManejoDeErrores(async (request: Request) => {
  const clave = claveConexion(request);
  await exigirSinBloqueo(clave);
  const { perfil, email, password, correoTutor } = validarCon(esquemaRegistroCuenta, await leerCuerpo(request));
  const { requiereAutorizacion } = await comprobarDatosDeRegistro(clave, perfil);

  if (requiereAutorizacion) {
    if (!correoTutor) {
      throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Escribe el correo de tu mamá, papá o tutor.');
    }
    if (correoTutor === email) {
      throw new ErrorDeNegocio('DATOS_INVALIDOS', 'El correo de tu tutor debe ser distinto al tuyo.');
    }
    autorizacionNoDisponible();
  }

  try {
    await registrarCuenta(email, password, perfil);
  } catch (error) {
    if (error instanceof ErrorEnvioConfirmacion) {
      throw new ErrorDeNegocio('CORREO_NO_ENVIADO');
    }
    throw error;
  }
  await reiniciarIntentos(clave);
  return responderOk({ mensaje: MENSAJE });
});
