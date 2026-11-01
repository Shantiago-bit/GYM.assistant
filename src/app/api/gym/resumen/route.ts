import { exigirSesion } from '@/lib/auth/sesion';
import { obtenerResumen } from '@/lib/dataService';
import { conManejoDeErrores, responderOk } from '@/lib/http/respuestas';
import { esquemaResumen } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

export const GET = conManejoDeErrores(async (request) => {
  const { id: usuarioId } = await exigirSesion();

  const parametros = new URL(request.url).searchParams;
  const { desde, hasta } = esquemaResumen.parse({
    desde: parametros.get('desde') ?? undefined,
    hasta: parametros.get('hasta') ?? undefined,
  });

  return responderOk(await obtenerResumen(usuarioId, desde, hasta));
});
