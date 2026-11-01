import { exigirSesion } from '@/lib/auth/sesion';
import { archivarEjercicio } from '@/lib/dataService';
import { conManejoDeErrores, responderOk, type ContextoEjercicio } from '@/lib/http/respuestas';

export const dynamic = 'force-dynamic';

export const POST = conManejoDeErrores(async (_request, { params }: ContextoEjercicio) => {
  const { id: usuarioId } = await exigirSesion();

  const { id } = await params;
  await archivarEjercicio(usuarioId, id);

  return responderOk({ archivado: true });
});
