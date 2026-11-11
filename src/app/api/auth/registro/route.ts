import { ErrorEnvioTutor, registrarCuentaMenor } from '@/lib/auth/autorizacionTutor';
import { ErrorEnvioConfirmacion, registrarCuenta } from '@/lib/auth/registro';
import {
  claveConexion,
  comprobarDatosDeRegistro,
  exigirCorreoTutor,
  exigirSinBloqueo,
} from '@/lib/auth/validarRegistro';
import { reiniciarIntentos } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { esquemaRegistroCuenta, validarCon } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

// La misma respuesta para correos nuevos y ya registrados: no revela qué cuentas existen.
const MENSAJE = 'Si el correo es nuevo, recibirás un enlace para confirmar tu cuenta.';
const MENSAJE_MENOR =
  'Le enviamos un correo a tu mamá, papá o tutor para que autorice tu cuenta. Cuando acepte, te llegará a ti un enlace para confirmar tu correo y entrar.';

// Paso 2 del registro. Vuelve a revisar todo lo del paso 1 (el cliente no es de fiar): el bloqueo, los
// nombres y la edad. Luego crea la cuenta y su perfil juntos.
export const POST = conManejoDeErrores(async (request: Request) => {
  const clave = claveConexion(request);
  await exigirSinBloqueo(clave);
  const { perfil, email, password, correoTutor } = validarCon(esquemaRegistroCuenta, await leerCuerpo(request));
  const { requiereAutorizacion } = await comprobarDatosDeRegistro(clave, perfil);

  // Menores: la cuenta queda pendiente y el correo va al tutor; la confirmación le llega al menor después.
  const tutor = requiereAutorizacion ? exigirCorreoTutor(correoTutor, email) : null;

  try {
    if (tutor) {
      await registrarCuentaMenor(email, password, perfil, tutor);
    } else {
      await registrarCuenta(email, password, perfil);
    }
  } catch (error) {
    if (error instanceof ErrorEnvioConfirmacion) {
      throw new ErrorDeNegocio('CORREO_NO_ENVIADO');
    }
    if (error instanceof ErrorEnvioTutor) {
      throw new ErrorDeNegocio('CORREO_NO_ENVIADO', 'No se pudo enviar el correo a tu tutor. Intenta de nuevo en unos minutos.');
    }
    throw error;
  }
  await reiniciarIntentos(clave);
  return responderOk({ mensaje: tutor ? MENSAJE_MENOR : MENSAJE, requiereAutorizacion: Boolean(tutor) });
});
