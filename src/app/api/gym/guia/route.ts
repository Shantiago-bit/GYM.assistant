import { exigirSesion } from '@/lib/auth/sesion';
import {
  guardarRecorrido,
  marcarOfertaVista,
  obtenerEjerciciosGuia,
  obtenerEstadoGuia,
  reiniciarGuia,
  type EstadoGuia,
} from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { esquemaAccionGuia, type AccionGuia } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

function aplicar(usuarioId: string, accion: AccionGuia): Promise<EstadoGuia> {
  switch (accion.accion) {
    case 'oferta_vista':
      return marcarOfertaVista(usuarioId);
    case 'recorrido':
      return guardarRecorrido(usuarioId, accion.recorrido, { estado: accion.estado, paso: accion.paso });
    case 'reiniciar':
      return reiniciarGuia(usuarioId);
  }
}

async function respuestaGuia(usuarioId: string, estado?: EstadoGuia) {
  const [estadoActual, ejercicios] = await Promise.all([
    estado ?? obtenerEstadoGuia(usuarioId),
    obtenerEjerciciosGuia(usuarioId),
  ]);
  return responderOk({ ...estadoActual, ejercicios });
}

export const GET = conManejoDeErrores(async () => {
  const { id: usuarioId } = await exigirSesion();
  return respuestaGuia(usuarioId);
});

export const PATCH = conManejoDeErrores(async (request) => {
  const { id: usuarioId } = await exigirSesion();
  const accion = esquemaAccionGuia.parse(await leerCuerpo(request));
  return respuestaGuia(usuarioId, await aplicar(usuarioId, accion));
});
