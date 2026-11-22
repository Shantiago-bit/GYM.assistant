import { exigirSesion } from '@/lib/auth/sesion';
import { cerrarTarjetaSemana } from '@/lib/dataService';
import { conManejoDeErrores, responderOk } from '@/lib/http/respuestas';
import { hoyBogota } from '@/lib/reglas/fechas';
import { inicioDeSemana } from '@/lib/reglas/inicio';

export const dynamic = 'force-dynamic';

// Cierra la tarjeta "Tu semana" hasta el lunes siguiente. El lunes lo calcula el servidor (hora de Bogotá).
export const POST = conManejoDeErrores(async () => {
  const { id: usuarioId } = await exigirSesion();
  const lunes = inicioDeSemana(hoyBogota());
  await cerrarTarjetaSemana(usuarioId, lunes);
  return responderOk({ semanaCerrada: lunes });
});
