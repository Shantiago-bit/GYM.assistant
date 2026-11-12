import { ErrorEnvioTutor, enviarSolicitudAlTutor } from '@/lib/auth/autorizacionTutor';
import { exigirSesion } from '@/lib/auth/sesion';
import { exigirCorreoTutor, exigirEdadMinima, tieneNombreOfensivo } from '@/lib/auth/validarRegistro';
import { EDAD_MINIMA_SIN_AUTORIZACION } from '@/lib/config/gym';
import {
  actualizarPerfil,
  borrarPerfil,
  crearPerfil,
  obtenerDiasVigentes,
  obtenerPerfil,
  type Perfil,
} from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { hoyBogota } from '@/lib/reglas/fechas';
import { calcularEdad, nombreParaMostrar } from '@/lib/reglas/perfil';
import { esquemaCompletarPerfil, esquemaEditarPerfil, validarCon } from '@/lib/validacion/esquemas';

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

// Los datos editables del perfil y los días de entrenamiento vigentes de la cuenta de la sesión.
export const GET = conManejoDeErrores(async () => {
  const { id: usuarioId } = await exigirSesion();
  const perfil = await obtenerPerfil(usuarioId);
  if (!perfil) {
    throw new ErrorDeNegocio('PERFIL_INCOMPLETO');
  }
  return responderOk({ ...vistaPublica(perfil), dias: await obtenerDiasVigentes(usuarioId, hoyBogota()) });
});

// Completa el perfil de una cuenta creada antes del registro en dos pasos. Si es menor de 12, el perfil
// queda pendiente y se pide la autorización a su tutor, igual que en el registro.
export const POST = conManejoDeErrores(async (request: Request) => {
  const { id: usuarioId, email } = await exigirSesion();
  const { correoTutor, ...datos } = validarCon(esquemaCompletarPerfil, await leerCuerpo(request));
  if (await obtenerPerfil(usuarioId)) {
    throw new ErrorDeNegocio('PERFIL_EXISTENTE');
  }
  exigirNombresPermitidos(datos);
  const edad = calcularEdad(datos.fechaNacimiento, hoyBogota());
  exigirEdadMinima(edad);

  if (edad < EDAD_MINIMA_SIN_AUTORIZACION) {
    const tutor = exigirCorreoTutor(correoTutor, email);
    await crearPerfil(usuarioId, datos, 'pendiente');
    try {
      await enviarSolicitudAlTutor(usuarioId, tutor, email, datos);
    } catch (error) {
      // Sin correo al tutor no hay solicitud: se deshace el perfil para que pueda intentarlo de nuevo.
      await borrarPerfil(usuarioId);
      if (error instanceof ErrorEnvioTutor) {
        throw new ErrorDeNegocio('CORREO_NO_ENVIADO', 'No se pudo enviar el correo a tu tutor. Intenta de nuevo en unos minutos.');
      }
      throw error;
    }
  } else {
    await crearPerfil(usuarioId, datos);
  }
  const perfil = await obtenerPerfil(usuarioId);
  return responderOk(perfil ? { ...vistaPublica(perfil), autorizacion: perfil.autorizacion } : null, 201);
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
