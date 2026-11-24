import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { exigirAdminDePagina } from '@/lib/auth/admin';
import { listarPersonas } from '@/lib/dataService';
import { hoyBogota } from '@/lib/reglas/fechas';
import {
  consultaPersonas,
  ESTADOS_PERSONA,
  leerFiltrosPersonas,
  POR_PAGINA,
  TEXTO_ESTADO,
  type OrdenPersonas,
} from '@/lib/reglas/personasAdmin';

export const metadata: Metadata = { title: 'Personas · Administración' };

const FECHA = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' });
const fecha = (texto: string | null) => (texto ? FECHA.format(new Date(`${texto}T00:00:00Z`)) : '—');
const CLASES_CAMPO = 'min-h-11 w-full rounded-gym border border-borde-campo bg-campo px-3 text-base text-texto';
const CLASES_ENLACE_BOTON =
  'inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario';

// Las columnas que se pueden ordenar, con su nombre visible.
const COLUMNAS: { clave: OrdenPersonas | null; texto: string; numerica?: boolean }[] = [
  { clave: null, texto: 'Correo' },
  { clave: 'apodo', texto: 'Apodo' },
  { clave: 'registro', texto: 'Registro' },
  { clave: null, texto: 'Estado' },
  { clave: 'ultima', texto: 'Última sesión' },
  { clave: 'ejercicios', texto: 'Ejercicios', numerica: true },
  { clave: 'sesiones', texto: 'Sesiones', numerica: true },
  { clave: null, texto: 'Racha', numerica: true },
  { clave: null, texto: 'Modo' },
];

export default async function PersonasAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirAdminDePagina();
  const filtros = leerFiltrosPersonas(await searchParams);
  const { filas, total } = await listarPersonas(filtros, hoyBogota());
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const desdeFila = total === 0 ? 0 : (filtros.pagina - 1) * POR_PAGINA + 1;
  const hastaFila = Math.min(total, filtros.pagina * POR_PAGINA);

  return (
    <>
      <section aria-labelledby="titulo-personas" className="space-y-1">
        <h1 id="titulo-personas" className="text-titulo-1 font-bold">
          Personas
        </h1>
        <p className="text-base text-[color:var(--admin-texto-claro-suave)]">
          {total.toLocaleString('es-CO')} {total === 1 ? 'cuenta' : 'cuentas'} con estos filtros. Los correos van enmascarados; el
          completo solo está en el detalle, que queda en la auditoría.
        </p>
      </section>

      {/* Los filtros viven en la URL: la vista se puede compartir o recargar. */}
      <form method="get" action="/admin/personas" className="vidrio grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end" aria-label="Filtros de personas">
        <label className="flex flex-col gap-1 text-sm font-medium text-texto lg:col-span-2">
          Correo exacto o inicio del apodo
          <input name="q" type="search" defaultValue={filtros.q ?? ''} className={CLASES_CAMPO} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-texto">
          Estado
          <select name="estado" defaultValue={filtros.estado ?? ''} className={CLASES_CAMPO}>
            <option value="">Todos</option>
            {ESTADOS_PERSONA.map((estado) => (
              <option key={estado} value={estado}>
                {TEXTO_ESTADO[estado]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-texto">
          Registro desde
          <input name="desde" type="date" defaultValue={filtros.desde ?? ''} className={CLASES_CAMPO} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-texto">
          Registro hasta
          <input name="hasta" type="date" defaultValue={filtros.hasta ?? ''} className={CLASES_CAMPO} />
        </label>
        {filtros.orden !== 'registro' ? <input type="hidden" name="orden" value={filtros.orden} /> : null}
        {filtros.dir !== 'desc' ? <input type="hidden" name="dir" value={filtros.dir} /> : null}
        <div className="flex flex-wrap gap-2 lg:col-span-5">
          <button type="submit" className={`${CLASES_ENLACE_BOTON} bg-primario text-white hover:bg-primario-fuerte`}>
            Filtrar
          </button>
          <Link href={'/admin/personas' as Route} className={`${CLASES_ENLACE_BOTON} border border-borde-fuerte text-texto hover:bg-primario-suave`}>
            Quitar filtros
          </Link>
          {/* Descarga directa: la ruta exige la sesión de administración y deja el registro en la auditoría. */}
          <a
            href={`/api/admin/personas/csv${consultaPersonas(filtros, { pagina: 1 })}`}
            className={`${CLASES_ENLACE_BOTON} border border-borde-fuerte text-texto hover:bg-primario-suave`}
          >
            Exportar CSV (sin datos personales)
          </a>
        </div>
      </form>

      <section aria-labelledby="titulo-tabla-personas" className="vidrio p-4">
        <h2 id="titulo-tabla-personas" className="sr-only">
          Lista de personas
        </h2>
        {filas.length === 0 ? (
          <p className="py-6 text-center text-base text-texto-suave">No hay personas con estos filtros.</p>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla de personas (se desplaza de lado)">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <caption className="sr-only">
                Personas, ordenadas por {COLUMNAS.find((c) => c.clave === filtros.orden)?.texto.toLowerCase()} ({filtros.dir === 'asc' ? 'ascendente' : 'descendente'})
              </caption>
              <thead>
                <tr className="border-b border-borde">
                  {COLUMNAS.map((columna) => {
                    const activa = columna.clave === filtros.orden;
                    return (
                      <th
                        key={columna.texto}
                        scope="col"
                        aria-sort={activa ? (filtros.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                        className={`px-3 py-2 font-semibold text-texto ${columna.numerica ? 'text-right' : ''}`}
                      >
                        {columna.clave ? (
                          <Link
                            href={`/admin/personas${consultaPersonas(filtros, {
                              orden: columna.clave,
                              dir: activa && filtros.dir === 'desc' ? 'asc' : 'desc',
                              pagina: 1,
                            })}` as Route}
                            className="inline-flex min-h-11 items-center gap-1 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
                          >
                            {columna.texto}
                            <span aria-hidden="true">{activa ? (filtros.dir === 'asc' ? '↑' : '↓') : ''}</span>
                          </Link>
                        ) : (
                          columna.texto
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.id} className="border-b border-borde last:border-0">
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/personas/${fila.id}` as Route}
                        className="inline-flex min-h-11 items-center font-medium text-primario underline-offset-4 hover:underline"
                      >
                        {fila.correoMascara}
                      </Link>
                      {fila.esAdmin ? <span className="ml-2 rounded-full bg-primario-suave px-2 py-0.5 text-xs font-semibold text-texto">Admin</span> : null}
                    </td>
                    <td className="px-3 py-2 text-texto">{fila.apodo ?? '—'}</td>
                    <td className="px-3 py-2 tabular-nums text-texto">{fecha(fila.registro)}</td>
                    <td className="px-3 py-2 text-texto">{TEXTO_ESTADO[fila.estado]}</td>
                    <td className="px-3 py-2 tabular-nums text-texto">{fecha(fila.ultimaActividad)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-texto">{fila.ejercicios}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-texto">{fila.sesiones}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-texto">{fila.racha}</td>
                    <td className="px-3 py-2 text-texto">{fila.modoAvanzado ? 'Avanzado' : 'Sencillo'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <nav aria-label="Páginas de la lista" className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-texto">
          <p>
            {desdeFila}–{hastaFila} de {total.toLocaleString('es-CO')} · página {filtros.pagina} de {paginas}
          </p>
          <div className="flex gap-2">
            {filtros.pagina > 1 ? (
              <Link href={`/admin/personas${consultaPersonas(filtros, { pagina: filtros.pagina - 1 })}` as Route} className={`${CLASES_ENLACE_BOTON} border border-borde-fuerte hover:bg-primario-suave`}>
                Anterior
              </Link>
            ) : null}
            {filtros.pagina < paginas ? (
              <Link href={`/admin/personas${consultaPersonas(filtros, { pagina: filtros.pagina + 1 })}` as Route} className={`${CLASES_ENLACE_BOTON} border border-borde-fuerte hover:bg-primario-suave`}>
                Siguiente
              </Link>
            ) : null}
          </div>
        </nav>
      </section>
    </>
  );
}
