import { z } from 'zod';
import { MENSAJE_REENVIO, reenviarConfirmacion } from '@/lib/auth/registro';
import { claveConexion } from '@/lib/auth/validarRegistro';
import { MAX_REENVIOS_CONFIRMACION_HORA } from '@/lib/config/gym';
import { consumirCupoReenvio } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { validarCon } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

const esquema = z.object({ email: z.string().trim().toLowerCase().email('Introduce un correo válido.') });

// Reenvía el enlace de confirmación. Responde SIEMPRE lo mismo (exista o no la cuenta, esté confirmada o no,
// se haya enviado o no): por dentro, reenviarConfirmacion aplica las reglas y deja registrado qué pasó.
export const POST = conManejoDeErrores(async (request: Request) => {
  // Como mucho MAX_REENVIOS_CONFIRMACION_HORA pedidos por hora por conexión (hash de la IP, nunca la IP).
  if (!(await consumirCupoReenvio(claveConexion(request), MAX_REENVIOS_CONFIRMACION_HORA))) {
    throw new ErrorDeNegocio(
      'REENVIOS_AGOTADOS',
      'Ya pediste varios reenvíos. Espera un rato, revisa Spam y Promociones, e inténtalo de nuevo más tarde.',
    );
  }
  const { email } = validarCon(esquema, await leerCuerpo(request));
  try {
    await reenviarConfirmacion(email);
  } catch {
    // Un fallo al enviar ya quedó registrado; responderlo revelaría que la cuenta existe.
  }
  return responderOk({ mensaje: MENSAJE_REENVIO });
});
