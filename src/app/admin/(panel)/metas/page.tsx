import type { Metadata } from 'next';
import { FormularioMeta } from '@/components/admin/FormularioMeta';
import { MedidorMeta } from '@/components/admin/MedidorMeta';
import { exigirAdminDePagina, puedeActuar } from '@/lib/auth/admin';
import { historialMeta, obtenerEstadisticasResumen, obtenerMetaDetallada } from '@/lib/dataService';
import { completarMeses, diasDelMes, mesDe, proyectarMeta } from '@/lib/reglas/admin';
import { hoyBogota } from '@/lib/reglas/fechas';
import { fechaHoraBogota } from '@/lib/reglas/personasAdmin';

export const metadata: Metadata = { title: 'Metas · Administración' };

const formato = (valor: number | null) => (valor === null ? '—' : valor.toLocaleString('es-CO'));

// Meta mensual de personas activas: el valor vigente, el medidor del mes, el formulario para cambiarla (solo rol
// 'admin') y el historial de cambios, que sale de la auditoría.
export default async function MetasAdminPage() {
  const admin = await exigirAdminDePagina();
  const hoy = hoyBogota();
  const [meta, estadisticas, historial] = await Promise.all([
    obtenerMetaDetallada(),
    obtenerEstadisticasResumen(hoy),
    historialMeta(),
  ]);
  const actual = completarMeses(estadisticas.meses, hoy, 1).at(-1)!;
  const proyeccion = proyectarMeta({
    activas: actual.activas,
    meta: meta.valor,
    dia: Number(hoy.slice(8, 10)),
    diasDelMes: diasDelMes(mesDe(hoy)),
  });

  return (
    <>
      <section aria-labelledby="titulo-metas" className="space-y-1">
        <h1 id="titulo-metas" className="text-titulo-1 font-bold">
          Metas
        </h1>
        <p className="text-base text-[color:var(--admin-texto-claro-suave)]">
          La meta del mes es cuántas personas distintas deberían registrar al menos una sesión en el mes.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section aria-labelledby="titulo-meta-vigente" className="vidrio space-y-4 p-5 sm:p-6 xl:col-span-2">
          <div>
            <h2 id="titulo-meta-vigente" className="text-titulo-2 font-bold text-texto">
              Meta vigente
            </h2>
            <p className="mt-2 text-4xl font-bold tabular-nums text-texto">
              {formato(meta.valor)} <span className="text-base font-medium text-texto-suave">personas activas por mes</span>
            </p>
            <p className="mt-1 text-sm text-texto-suave">
              {meta.guardada
                ? `Última actualización: ${fechaHoraBogota(meta.actualizadoEn)} (hora de Bogotá) por ${meta.actualizadoPor ?? 'una cuenta que ya no existe'}.`
                : 'Es la meta por defecto: nadie la ha cambiado todavía.'}
            </p>
          </div>
          {puedeActuar(admin) ? (
            <FormularioMeta metaActual={meta.valor} />
          ) : (
            <p className="text-sm text-texto-suave">Tu acceso es de solo lectura: puedes ver la meta, pero no cambiarla.</p>
          )}
        </section>
        <MedidorMeta meta={proyeccion} activasHoy={estadisticas.activasHoy} />
      </div>

      <section aria-labelledby="titulo-historial-meta" className="vidrio p-4">
        <h2 id="titulo-historial-meta" className="mb-3 text-titulo-2 font-bold text-texto">
          Historial de cambios
        </h2>
        {historial.length === 0 ? (
          <p className="py-4 text-center text-base text-texto-suave">La meta no se ha cambiado desde el panel.</p>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Historial de la meta (se desplaza de lado)">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <caption className="sr-only">Cambios de la meta, del más reciente al más antiguo (hora de Bogotá)</caption>
              <thead>
                <tr className="border-b border-borde">
                  <th scope="col" className="px-3 py-2 font-semibold text-texto">Fecha y hora</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-texto">Quién</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold text-texto">Antes</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold text-texto">Después</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((cambio, indice) => (
                  <tr key={`${cambio.fecha}-${indice}`} className="border-b border-borde last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-texto">{fechaHoraBogota(cambio.fecha)}</td>
                    <td className="px-3 py-2 text-texto">{cambio.admin ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-texto">{formato(cambio.anterior)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-texto">{formato(cambio.nuevo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-sm text-texto-suave">Se muestran los últimos 10 cambios. Todos quedan también en la Auditoría.</p>
      </section>
    </>
  );
}
