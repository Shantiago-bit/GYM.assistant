import { z } from 'zod';
import { responderAutorizacion } from '@/lib/auth/autorizacionTutor';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { ErrorDeNegocio } from '@/lib/reglas/errores';

export const dynamic = 'force-dynamic';

const esquema = z.object({
  token: z.string(),
  decision: z.enum(['aprobar', 'rechazar']),
});

// Pública: la respuesta del tutor depende solo del token (de un solo uso, con vencimiento y guardado como hash).
export const POST = conManejoDeErrores(async (request: Request) => {
  const datos = esquema.safeParse(await leerCuerpo(request));
  if (!datos.success) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'La respuesta no es válida.');
  }
  // Un token con otro formato no puede existir: se responde igual que a uno desconocido.
  if (!/^[0-9a-f]{64}$/.test(datos.data.token)) {
    throw new ErrorDeNegocio('AUTORIZACION_INVALIDA');
  }

  const resultado = await responderAutorizacion(
    datos.data.token,
    datos.data.decision === 'aprobar' ? 'aprobada' : 'rechazada',
  );
  if (resultado.estado === 'rechazada') {
    return responderOk({ ...resultado, mensaje: 'No autorizaste la cuenta. La cuenta y sus datos se eliminaron.' });
  }
  return responderOk({
    ...resultado,
    mensaje: resultado.confirmacionEnviada
      ? 'Listo, autorizaste la cuenta. Le enviamos a su correo el enlace para confirmarla y entrar.'
      : 'Listo, autorizaste la cuenta. No pudimos enviarle el correo de confirmación: puede pedirlo registrándose otra vez con el mismo correo.',
  });
});
