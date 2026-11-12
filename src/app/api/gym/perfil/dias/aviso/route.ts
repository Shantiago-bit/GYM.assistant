import { exigirSesion } from '@/lib/auth/sesion';
import { marcarAvisoDiasVisto } from '@/lib/dataService';
import { conManejoDeErrores, responderOk } from '@/lib/http/respuestas';

export const dynamic = 'force-dynamic';

// "Mantener lunes a sábado" (o "Elegir mis días"): el aviso de las cuentas existentes no vuelve a salir.
export const POST = conManejoDeErrores(async () => {
  const { id: usuarioId } = await exigirSesion();
  await marcarAvisoDiasVisto(usuarioId);
  return responderOk({ avisoDiasVisto: true });
});
