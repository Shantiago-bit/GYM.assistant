import { exigirSesion } from '@/lib/auth/sesion';
import { FOTO_MAX_BYTES } from '@/lib/config/gym';
import {
  borrarAvatar,
  guardarRutaAvatar,
  obtenerPerfil,
  subirAvatar,
  urlFirmadaAvatar,
} from '@/lib/dataService';
import { conManejoDeErrores, responderOk } from '@/lib/http/respuestas';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { detectarTipoImagen } from '@/lib/reglas/imagen';

export const dynamic = 'force-dynamic';

// Margen para las cabeceras del formulario multipart sobre el tamaño de la foto.
const MARGEN_MULTIPART = 16 * 1024;

// Los menores solo suben foto cuando su tutor ya autorizó la cuenta.
async function exigirPerfilHabilitado(usuarioId: string) {
  const perfil = await obtenerPerfil(usuarioId);
  if (!perfil) {
    throw new ErrorDeNegocio('PERFIL_INCOMPLETO');
  }
  if (perfil.autorizacion === 'pendiente' || perfil.autorizacion === 'rechazada') {
    throw new ErrorDeNegocio('AUTORIZACION_PENDIENTE');
  }
}

export const POST = conManejoDeErrores(async (request: Request) => {
  const { id: usuarioId } = await exigirSesion();
  await exigirPerfilHabilitado(usuarioId);

  const declarado = Number(request.headers.get('content-length') ?? 0);
  if (declarado > FOTO_MAX_BYTES + MARGEN_MULTIPART) {
    throw new ErrorDeNegocio('FOTO_MUY_GRANDE');
  }

  let archivo: FormDataEntryValue | null;
  try {
    archivo = (await request.formData()).get('foto');
  } catch {
    throw new ErrorDeNegocio('FOTO_NO_VALIDA');
  }
  if (!(archivo instanceof Blob)) {
    throw new ErrorDeNegocio('FOTO_NO_VALIDA');
  }
  if (archivo.size > FOTO_MAX_BYTES) {
    throw new ErrorDeNegocio('FOTO_MUY_GRANDE');
  }

  // El tipo se decide por los bytes, no por el nombre ni por lo que diga el navegador.
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const tipo = detectarTipoImagen(bytes);
  if (!tipo) {
    throw new ErrorDeNegocio('FOTO_NO_VALIDA');
  }

  const ruta = await subirAvatar(usuarioId, bytes, tipo);
  await guardarRutaAvatar(usuarioId, ruta);
  return responderOk({ avatarUrl: await urlFirmadaAvatar(ruta) });
});

export const DELETE = conManejoDeErrores(async () => {
  const { id: usuarioId } = await exigirSesion();
  await borrarAvatar(usuarioId);
  await guardarRutaAvatar(usuarioId, null);
  return responderOk({ avatarUrl: null });
});
