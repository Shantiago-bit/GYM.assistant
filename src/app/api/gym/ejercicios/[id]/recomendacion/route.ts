import { exigirSesion } from '@/lib/auth/sesion';
import { obtenerRecomendacion } from '@/lib/dataService';
import { conManejoDeErrores, responderOk, type ContextoEjercicio } from '@/lib/http/respuestas';

export const dynamic = 'force-dynamic';

export const GET = conManejoDeErrores(async (_request, { params }: ContextoEjercicio) => {
  await exigirSesion();

  const { id } = await params;

  return responderOk(await obtenerRecomendacion(id));
});
