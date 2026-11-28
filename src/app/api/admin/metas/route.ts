import { exigirAdmin } from '@/lib/auth/admin';
import { cambiarMetaActivasMes } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { esquemaMeta, validarCon } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

// Cambia la meta mensual de personas activas. Modifica datos, así que exige el rol 'admin' (con 'lectura': 403).
// La meta y su auditoría ('cambiar_meta' con {anterior, nuevo}) se guardan juntas en cambiarMetaActivasMes, que
// también invalida la caché del panel. Si el valor ya era ese, no se escribe ni se audita nada.
export const PUT = conManejoDeErrores(async (request: Request) => {
  const admin = await exigirAdmin({ rol: 'admin' });
  const { valor } = validarCon(esquemaMeta, await leerCuerpo(request));
  const cambio = await cambiarMetaActivasMes(valor, admin.id);
  const mensaje = cambio.cambiada
    ? `Meta actualizada: ${cambio.nuevo.toLocaleString('es-CO')} personas activas por mes.`
    : `La meta ya era de ${cambio.nuevo.toLocaleString('es-CO')} personas activas por mes.`;
  return responderOk({ ...cambio, mensaje });
});
