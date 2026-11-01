import { exigirSesion } from '@/lib/auth/sesion';
import { actualizarNivel } from '@/lib/dataService';
import {
  conManejoDeErrores,
  leerCuerpo,
  responderOk,
  type ContextoEjercicio,
} from '@/lib/http/respuestas';
import { esquemaNivel } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

export const POST = conManejoDeErrores(async (request, { params }: ContextoEjercicio) => {
  const { id: usuarioId } = await exigirSesion();

  const { id } = await params;
  const { nivel } = esquemaNivel.parse(await leerCuerpo(request));
  await actualizarNivel(usuarioId, id, nivel);

  return responderOk({ nivel });
});
