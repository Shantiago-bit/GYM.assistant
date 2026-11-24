import { exigirAdmin } from '@/lib/auth/admin';
import { listarPersonas } from '@/lib/dataService';
import { conManejoDeErrores, responderOk } from '@/lib/http/respuestas';
import { hoyBogota } from '@/lib/reglas/fechas';
import { leerFiltrosPersonas } from '@/lib/reglas/personasAdmin';

export const dynamic = 'force-dynamic';

// Lista paginada de personas (25 por página) con los filtros de la URL. Los correos van enmascarados; ver la lista
// no modifica nada, así que también la puede usar el rol 'lectura'.
export const GET = conManejoDeErrores(async (request: Request) => {
  await exigirAdmin();
  const filtros = leerFiltrosPersonas(Object.fromEntries(new URL(request.url).searchParams));
  return responderOk(await listarPersonas(filtros, hoyBogota()));
});
