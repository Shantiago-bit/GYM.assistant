import { exigirSesion } from '@/lib/auth/sesion';
import { marcarCumpleVisto } from '@/lib/dataService';
import { conManejoDeErrores, responderOk } from '@/lib/http/respuestas';
import { hoyBogota } from '@/lib/reglas/fechas';

export const dynamic = 'force-dynamic';

// Al cerrar la tarjeta de cumpleaños: no se vuelve a mostrar hasta el año siguiente.
export const POST = conManejoDeErrores(async () => {
  const { id: usuarioId } = await exigirSesion();
  const anio = Number(hoyBogota().slice(0, 4));
  await marcarCumpleVisto(usuarioId, anio);
  return responderOk({ anio });
});
