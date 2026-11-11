import { exigirSesion } from '@/lib/auth/sesion';
import {
  cambiarPrimerosPasosOcultos,
  marcarBienvenidaVista,
  marcarGuiaCompletada,
  obtenerDatosPrimerosPasos,
  obtenerEstadoGuia,
  reiniciarGuia,
  type EstadoGuia,
} from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { calcularPrimerosPasos } from '@/lib/reglas/guia';
import { esquemaAccionGuia, type AccionGuia } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

const ACCIONES: Record<AccionGuia, (usuarioId: string) => Promise<EstadoGuia>> = {
  bienvenida_vista: marcarBienvenidaVista,
  completar: marcarGuiaCompletada,
  ocultar_pasos: (usuarioId) => cambiarPrimerosPasosOcultos(usuarioId, true),
  mostrar_pasos: (usuarioId) => cambiarPrimerosPasosOcultos(usuarioId, false),
  reiniciar: reiniciarGuia,
};

async function respuestaGuia(usuarioId: string, estado?: EstadoGuia) {
  const [estadoActual, datos] = await Promise.all([
    estado ?? obtenerEstadoGuia(usuarioId),
    obtenerDatosPrimerosPasos(usuarioId),
  ]);
  return responderOk({ estado: estadoActual, primerosPasos: calcularPrimerosPasos(datos) });
}

export const GET = conManejoDeErrores(async () => {
  const { id: usuarioId } = await exigirSesion();
  return respuestaGuia(usuarioId);
});

export const PATCH = conManejoDeErrores(async (request) => {
  const { id: usuarioId } = await exigirSesion();
  const { accion } = esquemaAccionGuia.parse(await leerCuerpo(request));
  return respuestaGuia(usuarioId, await ACCIONES[accion](usuarioId));
});
