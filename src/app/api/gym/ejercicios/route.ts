import { exigirSesion } from '@/lib/auth/sesion';
import { crearEjercicio, listarEjercicios } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { esquemaEjercicio, esquemaFiltros } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

export const GET = conManejoDeErrores(async (request) => {
  const { id: usuarioId } = await exigirSesion();

  const parametros = new URL(request.url).searchParams;
  const { incluirArchivados } = esquemaFiltros.parse({
    incluirArchivados: parametros.get('incluirArchivados') ?? undefined,
  });

  return responderOk(await listarEjercicios(usuarioId, { incluirArchivados }));
});

export const POST = conManejoDeErrores(async (request) => {
  const { id: usuarioId } = await exigirSesion();

  const datos = esquemaEjercicio.parse(await leerCuerpo(request));

  return responderOk(await crearEjercicio(usuarioId, datos), 201);
});
