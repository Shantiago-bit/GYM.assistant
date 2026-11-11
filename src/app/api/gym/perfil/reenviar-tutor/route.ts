import { ErrorEnvioTutor, reenviarSolicitud } from '@/lib/auth/autorizacionTutor';
import { exigirSesionAunSinAutorizar } from '@/lib/auth/sesion';
import { conManejoDeErrores, responderOk } from '@/lib/http/respuestas';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

export const dynamic = 'force-dynamic';

// Desde "Esperando autorización": la única ruta de /api/gym que una cuenta pendiente puede usar.
export const POST = conManejoDeErrores(async () => {
  const { id: usuarioId } = await exigirSesionAunSinAutorizar();
  try {
    return responderOk(await reenviarSolicitud(usuarioId));
  } catch (error) {
    if (error instanceof ErrorEnvioTutor) {
      throw new ErrorDeNegocio('CORREO_NO_ENVIADO', 'No se pudo enviar el correo a tu tutor. Intenta de nuevo en unos minutos.');
    }
    throw error;
  }
});
