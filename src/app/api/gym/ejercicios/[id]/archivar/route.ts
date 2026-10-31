import { exigirSesion } from '@/lib/auth/sesion';
import { archivarEjercicio } from '@/lib/dataService';
import { conManejoDeErrores, responderOk, type ContextoEjercicio } from '@/lib/http/respuestas';

export const dynamic = 'force-dynamic';

export const POST = conManejoDeErrores(async (_request, { params }: ContextoEjercicio) => {
  await exigirSesion();

  const { id } = await params;
  await archivarEjercicio(id);

  return responderOk({ archivado: true });
});
