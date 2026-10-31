import { exigirSesion } from '@/lib/auth/sesion';
import { registrarSesion } from '@/lib/dataService';
import {
  conManejoDeErrores,
  leerCuerpo,
  responderOk,
  type ContextoEjercicio,
} from '@/lib/http/respuestas';
import { esquemaSesion } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

export const POST = conManejoDeErrores(async (request, { params }: ContextoEjercicio) => {
  await exigirSesion();

  const { id } = await params;
  const datos = esquemaSesion.parse(await leerCuerpo(request));

  return responderOk(await registrarSesion(id, datos), 201);
});
