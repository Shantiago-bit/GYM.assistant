import { revalidateTag } from 'next/cache';
import { exigirAdmin } from '@/lib/auth/admin';
import { ADMIN_ESPERA_CORREO_PRUEBA_SEGUNDOS } from '@/lib/config/gym';
import { enviarCorreo } from '@/lib/correo';
import { ETIQUETA_CACHE_ADMIN, registrarAuditoria, reservarCorreoPruebaAdmin } from '@/lib/dataService';
import { conManejoDeErrores, responderOk } from '@/lib/http/respuestas';
import { ASUNTO_PRUEBA, plantillaPrueba } from '@/lib/plantillasCorreo';
import { mascaraCorreo } from '@/lib/reglas/correo';
import { ErrorDeNegocio } from '@/lib/reglas/errores';
import { obtenerUrlBase } from '@/lib/urlBase';

export const dynamic = 'force-dynamic';

// Envía la plantilla de prueba a la cuenta de quien administra (el correo de su sesión): la ruta no recibe
// ninguna dirección, así que no sirve para escribirle a nadie más. Solo rol 'admin' (con 'lectura': 403) y uno
// por minuto por cuenta. El envío queda en registro_correos (tipo 'prueba') y en la auditoría
// ('enviar_correo_prueba' con el proveedor y el resultado, nunca el correo).
export const POST = conManejoDeErrores(async () => {
  const admin = await exigirAdmin({ rol: 'admin' });
  if (!admin.email) throw new ErrorDeNegocio('DATOS_INVALIDOS', 'Tu sesión no tiene un correo al que enviar la prueba.');

  if (!(await reservarCorreoPruebaAdmin(admin.id, ADMIN_ESPERA_CORREO_PRUEBA_SEGUNDOS))) {
    throw new ErrorDeNegocio('ESPERA_REQUERIDA', 'Ya enviaste un correo de prueba hace menos de un minuto. Espera un momento.');
  }

  const resultado = await enviarCorreo({
    para: admin.email,
    asunto: ASUNTO_PRUEBA,
    html: plantillaPrueba(`${obtenerUrlBase()}/admin/correos`),
    tipo: 'prueba',
    usuarioId: admin.id,
  });
  await registrarAuditoria({
    adminId: admin.id,
    accion: 'enviar_correo_prueba',
    detalle: { proveedor: resultado.proveedor, resultado: resultado.ok ? 'aceptado' : 'error' },
  });
  // Las cifras de /admin/correos están en la caché de 5 minutos: que el envío nuevo se vea ya.
  revalidateTag(ETIQUETA_CACHE_ADMIN);

  if (!resultado.ok) {
    throw new ErrorDeNegocio('CORREO_NO_ENVIADO', `No se pudo enviar el correo de prueba: ${resultado.error}`);
  }
  return responderOk({
    proveedor: resultado.proveedor,
    mensaje: `Correo de prueba enviado a ${mascaraCorreo(admin.email)}. Revisa también Spam y Promociones.`,
  });
});
