import { exigirSesion } from '@/lib/auth/sesion';
import { registrarSesionConLogro } from '@/lib/dataService';
import {
  conManejoDeErrores,
  leerCuerpo,
  responderOk,
  type ContextoEjercicio,
} from '@/lib/http/respuestas';
import { esquemaSesion } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

export const POST = conManejoDeErrores(async (request, { params }: ContextoEjercicio) => {
  const { id: usuarioId } = await exigirSesion();

  const { id } = await params;
  const datos = esquemaSesion.parse(await leerCuerpo(request));

  return responderOk(await registrarSesionConLogro(usuarioId, id, datos), 201);
});
