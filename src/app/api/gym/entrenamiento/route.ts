import { exigirSesion } from '@/lib/auth/sesion';
import { registrarEntrenamiento } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { esquemaEntrenamiento } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

export const POST = conManejoDeErrores(async (request) => {
  await exigirSesion();

  const datos = esquemaEntrenamiento.parse(await leerCuerpo(request));

  return responderOk(await registrarEntrenamiento(datos), 201);
});
