import { exigirSesion } from '@/lib/auth/sesion';
import { obtenerEjercicio } from '@/lib/dataService';
import { conManejoDeErrores, responderOk, type ContextoEjercicio } from '@/lib/http/respuestas';

export const dynamic = 'force-dynamic';

export const GET = conManejoDeErrores(async (_request, { params }: ContextoEjercicio) => {
  const { id: usuarioId } = await exigirSesion();

  const { id } = await params;

  return responderOk(await obtenerEjercicio(usuarioId, id));
});
