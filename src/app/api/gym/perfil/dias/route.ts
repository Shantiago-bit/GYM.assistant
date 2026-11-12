import { exigirSesion } from '@/lib/auth/sesion';
import { guardarDias } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { esquemaGuardarDias, validarCon } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

// Cambia los días de entrenamiento de la cuenta de la sesión, desde hoy: las rachas pasadas no cambian.
export const POST = conManejoDeErrores(async (request: Request) => {
  const { id: usuarioId } = await exigirSesion();
  const { dias } = validarCon(esquemaGuardarDias, await leerCuerpo(request));
  return responderOk({ dias: await guardarDias(usuarioId, dias) });
});
