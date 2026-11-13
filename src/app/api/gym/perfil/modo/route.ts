import { exigirSesion } from '@/lib/auth/sesion';
import { guardarModoAvanzado } from '@/lib/dataService';
import { conManejoDeErrores, leerCuerpo, responderOk } from '@/lib/http/respuestas';
import { esquemaModoAvanzado, validarCon } from '@/lib/validacion/esquemas';

export const dynamic = 'force-dynamic';

// Activa o desactiva las opciones avanzadas (métodos de series, RIR y técnicas) de la cuenta de la sesión.
// Solo cambia lo que se muestra: los ejercicios y las sesiones guardadas no se tocan.
export const POST = conManejoDeErrores(async (request: Request) => {
  const { id: usuarioId } = await exigirSesion();
  const { avanzado } = validarCon(esquemaModoAvanzado, await leerCuerpo(request));
  await guardarModoAvanzado(usuarioId, avanzado);
  return responderOk({ avanzado });
});
