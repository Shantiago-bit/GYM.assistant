import { exigirSesion } from '@/lib/auth/sesion';
import { autorizacionNoDisponible, exigirEdadMinima, tieneNombreOfensivo } from '@/lib/auth/validarRegistro';
import { EDAD_MINIMA_SIN_AUTORIZACION } from '@/lib/config/gym';
import { actualizarPerfil, crearPerfil, obtenerPerfil, type Perfil } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { hoyBogota } from '@/lib/reglas/fechas';
import { calcularEdad, nombreParaMostrar } from '@/lib/reglas/perfil';
import { esquemaDatosPersonales, esquemaEditarPerfil, validarCon } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

// Fuera de la etapa de registro, un nombre rechazado solo pide cambiarlo: no suma intentos ni bloquea.
function exigirNombresPermitidos(datos: { nombre: string; apodo?: string | undefined }) {
  if (tieneNombreOfensivo(datos)) {
    throw new ErrorDeNegocio('NOMBRE_NO_PERMITIDO');
  }
}

const vistaPublica = (perfil: Perfil) => ({
  nombre: perfil.nombre,
  apodo: perfil.apodo,
  genero: perfil.genero,
  nombreMostrado: nombreParaMostrar(perfil.nombre, perfil.apodo),
});

// Completa el perfil de una cuenta creada antes del registro en dos pasos.
export const POST = conManejoDeErrores(async (request: Request) => {
  const { id: usuarioId } = await exigirSesion();
  const datos = validarCon(esquemaDatosPersonales, await leerCuerpo(request));
  if (await obtenerPerfil(usuarioId)) {
    throw new ErrorDeNegocio('PERFIL_EXISTENTE');
  }
  exigirNombresPermitidos(datos);
  const edad = calcularEdad(datos.fechaNacimiento, hoyBogota());
  exigirEdadMinima(edad);
  if (edad < EDAD_MINIMA_SIN_AUTORIZACION) {
    autorizacionNoDisponible();
  }
  await crearPerfil(usuarioId, datos);
  const perfil = await obtenerPerfil(usuarioId);
  return responderOk(perfil ? vistaPublica(perfil) : null, 201);
});

// Edita nombre, apodo y género. La fecha de nacimiento no se edita desde la app.
export const PATCH = conManejoDeErrores(async (request: Request) => {
  const { id: usuarioId } = await exigirSesion();
  const datos = validarCon(esquemaEditarPerfil, await leerCuerpo(request));
  exigirNombresPermitidos(datos);
  const perfil = await actualizarPerfil(usuarioId, datos);
  if (!perfil) {
    throw new ErrorDeNegocio('PERFIL_INCOMPLETO');
  }
  return responderOk(vistaPublica(perfil));
});
