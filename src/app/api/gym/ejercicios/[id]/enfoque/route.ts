import { exigirSesion } from '@/lib/auth/sesion';
import { actualizarEnfoque } from '@/lib/dataService';
import {
  conManejoDeErrores,
  leerCuerpo,
  responderOk,
  type ContextoEjercicio,
} from '@/lib/http/respuestas';
import { esquemaEnfoque } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

export const POST = conManejoDeErrores(async (request, { params }: ContextoEjercicio) => {
  const { id: usuarioId } = await exigirSesion();

  const { id } = await params;
  const datos = esquemaEnfoque.parse(await leerCuerpo(request));
  await actualizarEnfoque(usuarioId, id, datos);

  return responderOk(datos);
});
