import { createClient } from '@supabase/supabase-js';

// Fachada de Gym Assistant: rutas y páginas importan datos solo desde aquí (sección 10.1 del plan).
export { obtenerSesion } from '@/lib/auth/sesion';
export {
  actualizarEnfoque,
  actualizarNivel,
  archivarEjercicio,
  cerrarConexiones,
  crearEjercicio,
  eliminarEjercicio,
  listarEjercicios,
  obtenerEjercicio,
  restaurarEjercicio,
} from '@/lib/datos/ejercicios';
export {
  guardarRecorrido,
  marcarOfertaVista,
  obtenerEjerciciosGuia,
  obtenerEstadoGuia,
  reiniciarGuia,
  type EjerciciosGuia,
  type EstadoGuia,
} from '@/lib/datos/guia';
export {
  actualizarPerfil,
  borrarPerfil,
  crearPerfil,
  guardarModoAvanzado,
  guardarRutaAvatar,
  marcarCumpleVisto,
  obtenerHistorialCompleto,
  obtenerPerfil,
  type DatosPerfil,
  type EstadoAutorizacion,
  type Genero,
  type Perfil,
} from '@/lib/datos/perfil';
export { estaBloqueado, registrarIntentoOfensivo, reiniciarIntentos } from '@/lib/datos/registroIntentos';
export {
  guardarDias,
  marcarAvisoDiasVisto,
  obtenerDiasVigentes,
  obtenerHistorialDias,
} from '@/lib/datos/diasEntrenamiento';
export {
  crearSolicitud,
  estaSinAutorizar,
  listarCuentasParaLimpiar,
  obtenerAutorizacionPorHash,
  obtenerSolicitudPendiente,
  responderSolicitud,
  solicitudEnPlazo,
  type Autorizacion,
  type SolicitudPendiente,
} from '@/lib/datos/autorizaciones';
export { obtenerRecomendacion } from '@/lib/datos/recomendacion';
export {
  borrarRegistrosDeCorreoAntiguos,
  consumirCupoReenvio,
  historialDeCorreo,
  type RegistroCorreo,
} from '@/lib/datos/registroCorreos';
export { obtenerResumen } from '@/lib/datos/resumen';
export {
  listarFechasConSesion,
  listarSesiones,
  registrarEntrenamiento,
  registrarPruebaInicial,
  registrarSesion,
  registrarSesionConLogro,
} from '@/lib/datos/sesiones';
export type * from '@/lib/datos/tipos';

const supabaseUrl = process.env.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_URL;
const supabaseServiceKey = process.env.GYMLEAD_SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl ?? '', supabaseServiceKey ?? '', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

type Usuario = {
  id: string;
  email: string | null;
};

export async function buscarUsuarioPorEmail(email: string): Promise<Usuario | null> {
  const emailLimpio = email.trim().toLowerCase();

  if (!emailLimpio) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('email', emailLimpio)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Usuario | null;
}

export async function contarSolicitudesRecuperacion(usuarioId: string): Promise<number> {
  const haceQuinceMinutos = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count, error } = await supabaseAdmin
    .from('restablecimientos_contrasena')
    .select('id', { count: 'exact', head: true })
    .eq('usuario_id', usuarioId)
    .gte('creado_en', haceQuinceMinutos);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function invalidarTokensPendientesPorUsuario(
  usuarioId: string,
  excluirTokenId?: string,
): Promise<void> {
  const ahora = new Date().toISOString();
  let consulta = supabaseAdmin
    .from('restablecimientos_contrasena')
    .update({ usado_en: new Date().toISOString() })
    .eq('usuario_id', usuarioId)
    .is('usado_en', null)
    .gt('expira_en', ahora);

  if (excluirTokenId) {
    consulta = consulta.neq('id', excluirTokenId);
  }

  const { error } = await consulta;

  if (error) {
    throw error;
  }
}

export async function crearTokenRecuperacion(
  usuarioId: string,
  tokenHash: string,
  expiraEn: string,
): Promise<{ id: string; usuario_id: string; token_hash: string; expira_en: string }> {
  const { data, error } = await supabaseAdmin
    .from('restablecimientos_contrasena')
    .insert({
      usuario_id: usuarioId,
      token_hash: tokenHash,
      expira_en: expiraEn,
    })
    .select('id, usuario_id, token_hash, expira_en')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function buscarTokenVigentePorHash(tokenHash: string) {
  const { data, error } = await supabaseAdmin
    .from('restablecimientos_contrasena')
    .select('*')
    .eq('token_hash', tokenHash)
    .is('usado_en', null)
    .gt('expira_en', 'now()')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function marcarTokenComoUsado(tokenId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('restablecimientos_contrasena')
    .update({ usado_en: new Date().toISOString() })
    .eq('id', tokenId);

  if (error) {
    throw error;
  }
}

export async function actualizarContrasena(usuarioId: string, nuevaContrasena: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(usuarioId, {
    password: nuevaContrasena,
  });

  if (error) {
    throw error;
  }
}

// Fotos de perfil: bucket privado. Solo el servidor (con la clave de servicio) sube, borra y firma URLs.
const BUCKET_AVATARES = 'avatares';
const VIGENCIA_URL_AVATAR_SEGUNDOS = 60 * 60;

export const rutaAvatar = (usuarioId: string) => `${usuarioId}/avatar.webp`;

export async function subirAvatar(usuarioId: string, bytes: Uint8Array, tipo: string): Promise<string> {
  const ruta = rutaAvatar(usuarioId);
  const { error } = await supabaseAdmin.storage
    .from(BUCKET_AVATARES)
    .upload(ruta, bytes, { contentType: tipo, upsert: true, cacheControl: '60' });
  if (error) {
    throw error;
  }
  return ruta;
}

export async function borrarAvatar(usuarioId: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(BUCKET_AVATARES).remove([rutaAvatar(usuarioId)]);
  if (error) {
    throw error;
  }
}

// URL firmada de corta duración. Si falla, la app muestra las iniciales en lugar de la foto.
export async function urlFirmadaAvatar(ruta: string | null): Promise<string | null> {
  if (!ruta) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_AVATARES)
    .createSignedUrl(ruta, VIGENCIA_URL_AVATAR_SEGUNDOS);
  return error ? null : data.signedUrl;
}

// Elimina una cuenta con todo lo suyo. El almacenamiento no tiene borrado en cascada, así que la foto se
// borra primero; el perfil, las autorizaciones, los ejercicios y la guía caen por cascada con auth.users.
export async function eliminarCuentaConDatos(usuarioId: string): Promise<void> {
  await borrarAvatar(usuarioId);
  const { error } = await supabaseAdmin.auth.admin.deleteUser(usuarioId);
  if (error) {
    throw error;
  }
}
