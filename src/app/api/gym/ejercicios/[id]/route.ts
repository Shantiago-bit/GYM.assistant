import { exigirSesion } from '@/lib/auth/sesion';
import { eliminarEjercicio, obtenerEjercicio } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk, type ContextoEjercicio } from '@/lib/http/respuestas';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { esquemaEliminarEjercicio } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

const normalizar = (texto: string) => texto.trim().toLocaleLowerCase('es');

export const GET = conManejoDeErrores(async (_request, { params }: ContextoEjercicio) => {
  const { id: usuarioId } = await exigirSesion();

  const { id } = await params;

  return responderOk(await obtenerEjercicio(usuarioId, id));
});

// Borra el ejercicio para siempre con sus sesiones y series. Hay que confirmar escribiendo su nombre.
export const DELETE = conManejoDeErrores(async (request, { params }: ContextoEjercicio) => {
  const { id: usuarioId } = await exigirSesion();

  const { id } = await params;
  const { confirmacion } = esquemaEliminarEjercicio.parse(await leerCuerpo(request));
  // Un ejercicio de otra cuenta responde 404 aquí, antes de comparar el nombre.
  const { ejercicio } = await obtenerEjercicio(usuarioId, id);

  if (normalizar(confirmacion) !== normalizar(ejercicio.nombre)) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Escribe el nombre exacto del ejercicio para confirmar.');
  }

  const { sesiones, series } = await eliminarEjercicio(usuarioId, id);

  return responderOk({ eliminado: true, sesiones, series });
});
