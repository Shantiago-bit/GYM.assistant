import { enviarJson } from '@/lib/http/cliente';
import type { AccionGuia } from '@/lib/validacion/esquemas';

// Registra una acción de la guía para la cuenta de la sesión. Si falla, la página sigue funcionando:
// a lo sumo la bienvenida o la tarjeta vuelven a aparecer en la próxima visita.
export async function registrarAccionGuia(accion: AccionGuia): Promise<boolean> {
  const resultado = await enviarJson('/api/gym/guia', { accion }, 'PATCH');
  return resultado.ok;
}
