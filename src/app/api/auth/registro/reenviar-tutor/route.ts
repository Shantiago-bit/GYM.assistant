import { z } from 'zod';
import { reenviarSolicitud } from '@/lib/auth/autorizacionTutor';
import { buscarCuenta } from '@/lib/auth/registro';
import { obtenerPerfil } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { validarCon } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

const esquema = z.object({ email: z.string().trim().toLowerCase().email('Introduce un correo válido.') });

const MENSAJE = 'Si hay una solicitud pendiente para ese correo, se la reenviamos a tu tutor.';

// Para el menor que acaba de registrarse (aún no puede iniciar sesión): reenvía la solicitud a la dirección
// guardada, con el mismo límite diario. Responde siempre igual para no revelar qué correos tienen cuenta.
export const POST = conManejoDeErrores(async (request: Request) => {
  const { email } = validarCon(esquema, await leerCuerpo(request));
  const cuenta = await buscarCuenta(email);
  if (cuenta && !cuenta.email_confirmed_at && (await obtenerPerfil(cuenta.id))?.autorizacion === 'pendiente') {
    await reenviarSolicitud(cuenta.id).catch(() => undefined);
  }
  return responderOk({ mensaje: MENSAJE });
});
