import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { exigirAdmin } from '@/lib/auth/admin';
import { reenviarSolicitud } from '@/lib/auth/autorizacionTutor';
import { reenviarConfirmacion } from '@/lib/auth/registro';
import {
  cuentaObjetivo,
  eliminarCuentaConDatos,
  ETIQUETA_CACHE_ADMIN,
  reactivarCuenta,
  registrarAuditoria,
  suspenderCuenta,
} from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { ACCIONES_PERSONA, confirmacionValida, esIdValido, motivoRechazo } from '@/lib/reglas/personasAdmin';
import { validarCon } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

interface Contexto {
  params: Promise<{ id: string }>;
}

const esquema = z.object({
  accion: z.enum(ACCIONES_PERSONA, { message: 'Acción no válida.' }),
  confirmacion: z.string().max(320).optional(),
});

const MENSAJE_REENVIO: Record<string, string> = {
  enviado: 'Enlace de confirmación reenviado.',
  reciente: 'No se reenvió: se envió uno hace menos de un minuto.',
  existente: 'No se reenvió: la cuenta ya está confirmada o es de un menor que espera a su tutor.',
};

// Acciones de soporte sobre una persona. Exigen el rol 'admin' (con 'lectura': 403). Nunca sobre la propia cuenta
// ni sobre otra cuenta de administración (403), aunque se llame a la API directamente. Todas quedan en la auditoría.
export const POST = conManejoDeErrores(async (request: Request, { params }: Contexto) => {
  const admin = await exigirAdmin({ rol: 'admin' });
  const { id } = await params;
  if (!esIdValido(id)) throw new ErrorDeNegocio('RECURSO_NO_ENCONTRADO');
  const { accion, confirmacion } = validarCon(esquema, await leerCuerpo(request));

  const objetivo = await cuentaObjetivo(id);
  if (!objetivo) throw new ErrorDeNegocio('RECURSO_NO_ENCONTRADO');
  const motivo = motivoRechazo({ adminId: admin.id, objetivoId: id, objetivoEsAdmin: objetivo.esAdmin });
  if (motivo) throw new ErrorDeNegocio('ACCION_NO_PERMITIDA', motivo);

  const auditar = (accionAuditada: 'reenviar_confirmacion' | 'reenviar_tutor' | 'suspender' | 'reactivar' | 'eliminar_cuenta', detalle: Record<string, string | number | boolean | null> = {}) =>
    registrarAuditoria({ adminId: admin.id, accion: accionAuditada, objetivoUsuarioId: id, detalle });

  let mensaje: string;
  switch (accion) {
    case 'reenviar_confirmacion': {
      const resultado = await reenviarConfirmacion(objetivo.correo);
      await auditar('reenviar_confirmacion', { resultado });
      mensaje = MENSAJE_REENVIO[resultado] ?? 'Listo.';
      break;
    }
    case 'reenviar_tutor': {
      if (objetivo.estado !== 'menor_pendiente') {
        throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Solo se reenvía al tutor en cuentas de menores pendientes.');
      }
      const { restantes } = await reenviarSolicitud(id);
      await auditar('reenviar_tutor', { restantes_hoy: restantes });
      mensaje = 'Correo al tutor reenviado.';
      break;
    }
    case 'suspender': {
      if (objetivo.estado === 'suspendida') throw new ErrorDeNegocio('DATOS_INVALIDOS', 'La cuenta ya está suspendida.');
      await suspenderCuenta(id);
      await auditar('suspender');
      mensaje = 'Cuenta suspendida: ya no puede entrar.';
      break;
    }
    case 'reactivar': {
      if (objetivo.estado !== 'suspendida') throw new ErrorDeNegocio('DATOS_INVALIDOS', 'La cuenta no está suspendida.');
      await reactivarCuenta(id);
      await auditar('reactivar');
      mensaje = 'Cuenta reactivada.';
      break;
    }
    case 'eliminar': {
      if (!confirmacionValida(confirmacion, objetivo.correo)) {
        throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Escribe el correo completo de la cuenta para confirmar.');
      }
      // Primero la auditoría: después de borrar, la cuenta ya no existe y su id queda en NULL en el registro.
      await auditar('eliminar_cuenta', { estado_previo: objetivo.estado });
      await eliminarCuentaConDatos(id);
      mensaje = 'Cuenta eliminada con todos sus datos.';
      break;
    }
  }
  revalidateTag(ETIQUETA_CACHE_ADMIN);
  return responderOk({ mensaje });
});
