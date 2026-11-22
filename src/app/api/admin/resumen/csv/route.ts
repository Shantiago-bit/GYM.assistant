import { exigirAdmin } from '@/lib/auth/admin';
import { obtenerEstadisticasResumen, registrarAuditoria } from '@/lib/dataService';
import { conManejoDeErrores } from '@/lib/http/respuestas';
import { completarMeses, csvResumen } from '@/lib/reglas/admin';
import { hoyBogota } from '@/lib/reglas/fechas';

export const dynamic = 'force-dynamic';

// Exporta el resumen de los últimos 12 meses: solo cifras agregadas por mes (nunca correos, nombres ni ids).
// Ver no modifica datos, así que también lo puede usar el rol 'lectura'. Cada exportación queda en la auditoría.
export const GET = conManejoDeErrores(async () => {
  const admin = await exigirAdmin();
  const hoy = hoyBogota();
  const { meses } = await obtenerEstadisticasResumen(hoy);
  const csv = csvResumen(completarMeses(meses, hoy, 12));
  await registrarAuditoria({ adminId: admin.id, accion: 'exportar_csv', detalle: { reporte: 'resumen', meses: 12 } });

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="resumen-gym-assistant-${hoy}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
});
