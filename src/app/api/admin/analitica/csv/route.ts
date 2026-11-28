import { exigirAdmin } from '@/lib/auth/admin';
import { SLUG_APP } from '@/lib/config/marca';
import { estadisticasAnalitica, registrarAuditoria } from '@/lib/dataService';
import { conManejoDeErrores } from '@/lib/http/respuestas';
import { csvAnalitica, leerSemanasAnalitica } from '@/lib/reglas/analiticaAdmin';
import { hoyBogota } from '@/lib/reglas/fechas';

export const dynamic = 'force-dynamic';

// Exporta Analítica (embudo y cohortes de 8 o 12 semanas): solo cifras y los lunes de cada cohorte, nunca correos,
// nombres ni ids. Ver no modifica datos, así que también lo puede usar el rol 'lectura'. Cada exportación queda en
// la auditoría ('exportar_csv' con {seccion: 'analitica', semanas}).
export const GET = conManejoDeErrores(async (request: Request) => {
  const admin = await exigirAdmin();
  const semanas = leerSemanasAnalitica(new URL(request.url).searchParams.get('semanas') ?? undefined);
  const hoy = hoyBogota();
  const estadisticas = await estadisticasAnalitica(hoy, semanas);
  const csv = csvAnalitica(estadisticas);
  await registrarAuditoria({ adminId: admin.id, accion: 'exportar_csv', detalle: { seccion: 'analitica', semanas } });

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="analitica-${SLUG_APP}-${hoy}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
});
