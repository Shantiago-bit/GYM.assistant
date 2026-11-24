import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { exigirAdminDePagina } from '@/lib/auth/admin';
import { administradoresDeAuditoria, listarAuditoria } from '@/lib/dataService';
import {
  consultaAuditoria,
  fechaHoraBogota,
  leerFiltrosAuditoria,
  POR_PAGINA,
  resumirDetalle,
  TEXTO_ACCION,
} from '@/lib/reglas/personasAdmin';

export const metadata: Metadata = { title: 'Auditoría · Administración' };

const CLASES_CAMPO = 'min-h-11 w-full rounded-gym border border-borde-campo bg-campo px-3 text-base text-texto';
const CLASES_ENLACE_BOTON =
  'inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario';

// Solo lectura: el registro no se edita ni se borra desde ningún lado (la tabla solo admite INSERT; la tarea Cron
// borra lo que pasa del plazo de retención).
export default async function AuditoriaAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirAdminDePagina();
  const filtros = leerFiltrosAuditoria(await searchParams);
  const [{ filas, total }, administradores] = await Promise.all([listarAuditoria(filtros), administradoresDeAuditoria()]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <>
      <section aria-labelledby="titulo-auditoria" className="space-y-1">
        <h1 id="titulo-auditoria" className="text-titulo-1 font-bold">
          Auditoría
        </h1>
        <p className="text-base text-[color:var(--admin-texto-claro-suave)]">
          Todo lo que se hace desde el panel queda aquí. Es de solo lectura: nadie puede editarlo ni borrarlo.
        </p>
      </section>

      <form method="get" action="/admin/auditoria" className="vidrio grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end" aria-label="Filtros de la auditoría">
        <label className="flex flex-col gap-1 text-sm font-medium text-texto">
          Quién
          <select name="admin" defaultValue={filtros.adminId ?? ''} className={CLASES_CAMPO}>
            <option value="">Todas las cuentas</option>
            {administradores.map((admin) => (
              <option key={admin.id} value={admin.id}>
                {admin.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-texto">
          Acción
          <select name="accion" defaultValue={filtros.accion ?? ''} className={CLASES_CAMPO}>
            <option value="">Todas</option>
            {Object.entries(TEXTO_ACCION).map(([clave, texto]) => (
              <option key={clave} value={clave}>
                {texto}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-texto">
          Desde
          <input name="desde" type="date" defaultValue={filtros.desde ?? ''} className={CLASES_CAMPO} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-texto">
          Hasta
          <input name="hasta" type="date" defaultValue={filtros.hasta ?? ''} className={CLASES_CAMPO} />
        </label>
        <div className="flex flex-wrap gap-2 lg:col-span-4">
          <button type="submit" className={`${CLASES_ENLACE_BOTON} bg-primario text-white hover:bg-primario-fuerte`}>
            Filtrar
          </button>
          <Link href={'/admin/auditoria' as Route} className={`${CLASES_ENLACE_BOTON} border border-borde-fuerte text-texto hover:bg-primario-suave`}>
            Quitar filtros
          </Link>
        </div>
      </form>

      <section aria-labelledby="titulo-tabla-auditoria" className="vidrio p-4">
        <h2 id="titulo-tabla-auditoria" className="sr-only">
          Registro de acciones
        </h2>
        {filas.length === 0 ? (
          <p className="py-6 text-center text-base text-texto-suave">No hay acciones con estos filtros.</p>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla de auditoría (se desplaza de lado)">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <caption className="sr-only">Acciones del panel, de la más reciente a la más antigua (hora de Bogotá)</caption>
              <thead>
                <tr className="border-b border-borde">
                  <th scope="col" className="px-3 py-2 font-semibold text-texto">Fecha y hora</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-texto">Quién</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-texto">Acción</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-texto">Cuenta</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-texto">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.id} className="border-b border-borde align-top last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-texto">{fechaHoraBogota(fila.fecha)}</td>
                    <td className="px-3 py-2 text-texto">{fila.admin ?? '—'}</td>
                    <td className="px-3 py-2 text-texto">{TEXTO_ACCION[fila.accion] ?? fila.accion}</td>
                    <td className="px-3 py-2">
                      {fila.objetivoId ? (
                        <Link
                          href={`/admin/personas/${fila.objetivoId}` as Route}
                          className="inline-flex min-h-11 items-center font-medium text-primario underline-offset-4 hover:underline"
                        >
                          {fila.objetivoMascara ?? 'Ver cuenta'}
                        </Link>
                      ) : (
                        <span className="text-texto-suave">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-texto-suave">{resumirDetalle(fila.detalle) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <nav aria-label="Páginas de la auditoría" className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-texto">
          <p>
            {total.toLocaleString('es-CO')} {total === 1 ? 'acción' : 'acciones'} · página {filtros.pagina} de {paginas}
          </p>
          <div className="flex gap-2">
            {filtros.pagina > 1 ? (
              <Link href={`/admin/auditoria${consultaAuditoria(filtros, { pagina: filtros.pagina - 1 })}` as Route} className={`${CLASES_ENLACE_BOTON} border border-borde-fuerte hover:bg-primario-suave`}>
                Anterior
              </Link>
            ) : null}
            {filtros.pagina < paginas ? (
              <Link href={`/admin/auditoria${consultaAuditoria(filtros, { pagina: filtros.pagina + 1 })}` as Route} className={`${CLASES_ENLACE_BOTON} border border-borde-fuerte hover:bg-primario-suave`}>
                Siguiente
              </Link>
            ) : null}
          </div>
        </nav>
      </section>
    </>
  );
}
