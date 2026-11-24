import { exigirAdmin } from '@/lib/auth/admin';
import { personasParaCsv, registrarAuditoria } from '@/lib/dataService';
import { conManejoDeErrores } from '@/lib/http/respuestas';
import { hoyBogota } from '@/lib/reglas/fechas';
import { csvPersonas, leerFiltrosPersonas } from '@/lib/reglas/personasAdmin';

export const dynamic = 'force-dynamic';

// La lista filtrada en CSV, SOLO con columnas no personales (estado, fecha de registro, última actividad, conteos,
// racha y modo): nunca correos, nombres, apodos ni ids. Cada exportación queda en la auditoría.
export const GET = conManejoDeErrores(async (request: Request) => {
  const admin = await exigirAdmin();
  const hoy = hoyBogota();
  const filtros = leerFiltrosPersonas(Object.fromEntries(new URL(request.url).searchParams));
  const filas = await personasParaCsv(filtros, hoy);
  await registrarAuditoria({
    adminId: admin.id,
    accion: 'exportar_csv',
    detalle: { reporte: 'personas', filas: filas.length, estado: filtros.estado, desde: filtros.desde, hasta: filtros.hasta },
  });
  return new Response(csvPersonas(filas), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="personas-${hoy}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
});
