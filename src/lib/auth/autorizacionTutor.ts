import { buscarCuenta, enlaceDeConfirmacion, errorDeAlta, yaExiste, type ResultadoRegistro } from '@/lib/auth/registro';
import { MAX_REENVIOS_TUTOR_DIA, VIGENCIA_AUTORIZACION_DIAS } from '@/lib/config/gym';
import { correoDeContacto, enviarCorreo, registrarOmision } from '@/lib/correo';
import {
  crearPerfil,
  crearSolicitud,
  eliminarCuentaConDatos,
  obtenerPerfil,
  obtenerSolicitudPendiente,
  responderSolicitud,
  solicitudEnPlazo,
  supabaseAdmin,
  type DatosPerfil,
} from '@/lib/dataService';
import { ASUNTO_CONFIRMACION, plantillaAutorizacionTutor, plantillaConfirmacion } from '@/lib/plantillasCorreo';
import { fechaLarga, reenviosRestantes } from '@/lib/reglas/autorizacion';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { hoyBogota } from '@/lib/reglas/fechas';
import { calcularEdad, nombreParaMostrar } from '@/lib/reglas/perfil';
import { calcularHashToken, generarToken } from '@/lib/tokenRecuperacion';
import { obtenerUrlBase } from '@/lib/urlBase';

// Flujo de autorización de tutores para menores de EDAD_MINIMA_SIN_AUTORIZACION años:
// 1. La cuenta se crea sin confirmar y con el perfil en 'pendiente'; el menor no recibe nada todavía.
// 2. El tutor recibe un enlace de un solo uso (/autorizar/<token>; se guarda solo el hash).
// 3. Si autoriza, el perfil pasa a 'aprobada' y el menor recibe la confirmación normal. Si no, la cuenta se borra.
// 4. Sin respuesta en VIGENCIA_AUTORIZACION_DIAS días, la limpieza programada borra la cuenta.

export class ErrorEnvioTutor extends Error {}

export const enlaceDeAutorizacion = (token: string) => `${obtenerUrlBase()}/autorizar/${token}`;

async function correoDeCuenta(usuarioId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.auth.admin.getUserById(usuarioId);
  return data.user?.email ?? null;
}

// Crea una solicitud (dejando sin efecto las anteriores) y envía el correo al tutor.
export async function enviarSolicitudAlTutor(
  usuarioId: string,
  correoTutor: string,
  correoMenor: string,
  perfil: Pick<DatosPerfil, 'nombre' | 'apodo' | 'fechaNacimiento'>,
  tipo: 'autorizacion_tutor' | 'reenvio_tutor' = 'autorizacion_tutor',
): Promise<void> {
  const token = generarToken();
  const { venceDia } = await crearSolicitud(usuarioId, correoTutor, calcularHashToken(token));
  const { asunto, html } = plantillaAutorizacionTutor({
    nombre: perfil.nombre.trim(),
    apodo: nombreParaMostrar(perfil.nombre.trim(), perfil.apodo?.trim() || null),
    edad: calcularEdad(perfil.fechaNacimiento, hoyBogota()),
    correoMenor,
    enlace: enlaceDeAutorizacion(token),
    venceEl: fechaLarga(venceDia),
    dias: VIGENCIA_AUTORIZACION_DIAS,
    urlPrivacidad: `${obtenerUrlBase()}/privacidad`,
    contacto: correoDeContacto(),
  });
  const resultado = await enviarCorreo({ para: correoTutor, asunto, html, tipo, usuarioId });
  if (!resultado.ok) {
    throw new ErrorEnvioTutor(resultado.error);
  }
}

// Reenvía la solicitud a la misma dirección, con un enlace nuevo. Máximo MAX_REENVIOS_TUTOR_DIA por día.
export async function reenviarSolicitud(usuarioId: string): Promise<{ restantes: number }> {
  const solicitud = await obtenerSolicitudPendiente(usuarioId);
  if (!solicitud) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Esta cuenta no tiene una solicitud pendiente.');
  }
  if (solicitud.reenviosHoy >= MAX_REENVIOS_TUTOR_DIA) {
    throw new ErrorDeNegocio(
      'REENVIOS_AGOTADOS',
      `Ya reenviaste la solicitud ${MAX_REENVIOS_TUTOR_DIA} veces hoy. Podrás hacerlo de nuevo mañana.`,
    );
  }
  if (!(await solicitudEnPlazo(usuarioId))) {
    throw new ErrorDeNegocio('AUTORIZACION_VENCIDA', 'El plazo para autorizar esta cuenta ya venció.');
  }
  const [perfil, correoMenor] = await Promise.all([obtenerPerfil(usuarioId), correoDeCuenta(usuarioId)]);
  if (!perfil || !correoMenor) {
    throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Esta cuenta no tiene una solicitud pendiente.');
  }
  await enviarSolicitudAlTutor(
    usuarioId,
    solicitud.correoTutor,
    correoMenor,
    { nombre: perfil.nombre, apodo: perfil.apodo ?? undefined, fechaNacimiento: perfil.fechaNacimiento },
    'reenvio_tutor',
  );
  return { restantes: reenviosRestantes(solicitud.reenviosHoy + 1) };
}

// Registro de un menor: cuenta sin confirmar, perfil pendiente y correo al tutor. Si algo falla, la cuenta
// nueva se borra. Si el correo ya tenía cuenta, la respuesta es la misma (no revela qué correos existen); si
// esa cuenta es de un menor pendiente, se reenvía la solicitud a su tutor, dentro del límite diario.
export async function registrarCuentaMenor(
  correoIngresado: string,
  contrasena: string,
  perfil: DatosPerfil,
  correoTutor: string,
): Promise<ResultadoRegistro> {
  const correo = correoIngresado.trim().toLowerCase();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: correo,
    password: contrasena,
    email_confirm: false,
    user_metadata: { full_name: correo.split('@')[0] },
  });

  if (error) {
    if (!yaExiste(error)) {
      throw errorDeAlta(error);
    }
    const cuenta = await buscarCuenta(correo);
    const autorizacion = cuenta ? (await obtenerPerfil(cuenta.id))?.autorizacion : undefined;
    if (cuenta && !cuenta.email_confirmed_at && autorizacion === 'pendiente') {
      await reenviarSolicitud(cuenta.id).catch(() => undefined);
    } else if (cuenta) {
      // No se escribe a nadie; queda registrado por qué (la respuesta a la persona es la misma).
      await registrarOmision({
        tipo: 'autorizacion_tutor',
        para: correo,
        usuarioId: cuenta.id,
        motivo: cuenta.email_confirmed_at ? 'cuenta_confirmada' : autorizacion === 'rechazada' ? 'menor_rechazado' : 'menor_pendiente',
      });
    }
    return 'existente';
  }

  try {
    await crearPerfil(data.user.id, perfil, 'pendiente');
    await enviarSolicitudAlTutor(data.user.id, correoTutor, correo, perfil);
  } catch (fallo) {
    await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    throw fallo;
  }
  return 'enviado';
}

// Tras la autorización: si la cuenta no está confirmada, el menor recibe la confirmación normal (enlace
// mágico, como el reenvío a cuentas sin confirmar). Las cuentas anteriores ya confirmadas entran directo.
async function enviarConfirmacionAlMenor(usuarioId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.auth.admin.getUserById(usuarioId);
  const usuario = data.user;
  if (!usuario?.email) return false;
  if (usuario.email_confirmed_at) return true;
  const enlace = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: usuario.email });
  if (enlace.error) return false;
  const resultado = await enviarCorreo({
    para: usuario.email,
    asunto: ASUNTO_CONFIRMACION,
    html: plantillaConfirmacion(enlaceDeConfirmacion(enlace.data.properties.hashed_token, 'magiclink')),
    tipo: 'confirmacion_tras_autorizacion',
    usuarioId,
  });
  return resultado.ok;
}

export type RespuestaTutor =
  | { estado: 'aprobada'; confirmacionEnviada: boolean }
  | { estado: 'rechazada' };

// Respuesta del tutor. El token solo sirve una vez y dentro del plazo.
export async function responderAutorizacion(token: string, decision: 'aprobada' | 'rechazada'): Promise<RespuestaTutor> {
  const resultado = await responderSolicitud(calcularHashToken(token), decision);
  switch (resultado.estado) {
    case 'invalido':
      throw new ErrorDeNegocio('AUTORIZACION_INVALIDA');
    case 'usado':
      throw new ErrorDeNegocio('AUTORIZACION_USADA');
    case 'vencido':
      throw new ErrorDeNegocio('AUTORIZACION_VENCIDA');
    case 'rechazada':
      // Si el borrado falla, el perfil queda 'rechazada' (sin acceso) y la limpieza programada lo reintenta.
      await eliminarCuentaConDatos(resultado.usuarioId).catch(() =>
        console.error('No se pudo eliminar una cuenta rechazada; la limpieza programada lo reintentará.'),
      );
      return { estado: 'rechazada' };
    case 'aprobada':
      return {
        estado: 'aprobada',
        confirmacionEnviada: await enviarConfirmacionAlMenor(resultado.usuarioId).catch(() => false),
      };
  }
}
