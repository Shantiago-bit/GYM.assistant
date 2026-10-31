import { exigirSesion } from '@/lib/auth/sesion';
import { registrarPruebaInicial } from '@/lib/dataService';
import {
  conManejoDeErrores,
  leerCuerpo,
  responderOk,
  type ContextoEjercicio,
} from '@/lib/http/respuestas';
import { esquemaPrueba } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

export const POST = conManejoDeErrores(async (request, { params }: ContextoEjercicio) => {
  await exigirSesion();

  const { id } = await params;
  const { series } = esquemaPrueba.parse(await leerCuerpo(request));

  return responderOk(await registrarPruebaInicial(id, series), 201);
});
