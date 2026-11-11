import { exigirSesion } from '@/lib/auth/sesion';
import { restaurarEjercicio } from '@/lib/dataService';
import { conManejoDeErrores, responderOk, type ContextoEjercicio } from '@/lib/http/respuestas';

export const dynamic = 'force-dynamic';

// Si el ejercicio ya estaba activo, responde igual sin cambiar nada.
export const POST = conManejoDeErrores(async (_request, { params }: ContextoEjercicio) => {
  const { id: usuarioId } = await exigirSesion();

  const { id } = await params;
  await restaurarEjercicio(usuarioId, id);

  return responderOk({ archivado: false });
});
