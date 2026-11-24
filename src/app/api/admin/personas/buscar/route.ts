import { exigirAdmin } from '@/lib/auth/admin';
import { buscarPersonas } from '@/lib/dataService';
import { conManejoDeErrores, responderOk } from '@/lib/http/respuestas';

export const dynamic = 'force-dynamic';

// Buscador de la barra superior: correo exacto o prefijo del apodo, hasta 8 resultados (y si hay más).
export const GET = conManejoDeErrores(async (request: Request) => {
  await exigirAdmin();
  const q = (new URL(request.url).searchParams.get('q') ?? '').slice(0, 120);
  return responderOk(await buscarPersonas(q));
});
