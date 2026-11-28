import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { GraficoBarras } from '@/components/admin/graficos/GraficoBarras';
import { TablaDatos } from '@/components/admin/graficos/TablaDatos';
import { TarjetaCifra } from '@/components/admin/TarjetaCifra';
import { BotonCorreoPrueba } from '@/components/admin/BotonCorreoPrueba';
import { exigirAdminDePagina, puedeActuar } from '@/lib/auth/admin';
import { mascaraCorreo } from '@/lib/reglas/correo';
import { estadisticasCorreos, listarCorreos, obtenerContadoresMenu } from '@/lib/dataService';
import {
  consultaCorreos,
  DIAS_GRAFICO_CORREOS,
  enPalabras,
  leerFiltrosCorreos,
  PERIODO_CORREOS_POR_DEFECTO,
  PERIODOS_CORREOS,
  PROVEEDORES_CORREO,
  RESULTADOS_ENVIO,
  TEXTO_MOTIVO_OMISION,
  TEXTO_PERIODO_CORREOS,
  TEXTO_PROVEEDOR,
  TEXTO_RESULTADO_ENVIO,
  TEXTO_TIPO_CORREO,
  textoTasa,
  TIPOS_CORREO,
} from '@/lib/reglas/correosAdmin';
import { hoyBogota } from '@/lib/reglas/fechas';
import { fechaHoraBogota, POR_PAGINA } from '@/lib/reglas/personasAdmin';

export const metadata: Metadata = { title: 'Correos · Administración' };

const CLASES_CAMPO = 'min-h-11 w-full rounded-gym border border-borde-campo bg-campo px-3 text-base text-texto';
const CLASES_ENLACE_BOTON =
  'inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario';
// Las fechas del gráfico ya son días de Bogotá (AAAA-MM-DD): se formatean en UTC para no correrlas un día.
const DIA_CORTO = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const DIA_LARGO = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const deDia = (dia: string) => new Date(`${dia}T00:00:00Z`);
const numero = (valor: number) => valor.toLocaleString('es-CO');

// Registro de envíos de correo: cifras del periodo, correos por día y la lista con filtros. Solo lectura. Los
// destinatarios van enmascarados (nunca el correo ni su hash); el correo completo solo está en el detalle de la
// persona, que queda en la auditoría.
export default async function CorreosAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await exigirAdminDePagina();
  const filtros = leerFiltrosCorreos(await searchParams);
  const hoy = hoyBogota();
  const [estadisticas, { filas, total }, contadores] = await Promise.all([
    estadisticasCorreos(hoy, filtros.periodo),
    listarCorreos(filtros),
    obtenerContadoresMenu(hoy),
  ]);
  const { resumen, dias, duracionPorProveedor } = estadisticas;
  const intentos = resumen.porResultado.aceptado + resumen.porResultado.rechazado + resumen.porResultado.error;
  const textoPeriodo = TEXTO_PERIODO_CORREOS[filtros.periodo].toLowerCase();
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const desdeFila = total === 0 ? 0 : (filtros.pagina - 1) * POR_PAGINA + 1;
  const hastaFila = Math.min(total, filtros.pagina * POR_PAGINA);

  return (
    <>
      <section aria-labelledby="titulo-correos" className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 id="titulo-correos" className="text-titulo-1 font-bold">
            Correos
          </h1>
          <p className="text-base text-[color:var(--admin-texto-claro-suave)]">
            Cada correo que la app envía o decide no enviar. El registro guarda los últimos 30 días.
          </p>
        </div>
        {puedeActuar(admin) && admin.email ? <BotonCorreoPrueba destinatarioMascara={mascaraCorreo(admin.email)} /> : null}
      </section>

      <section aria-labelledby="titulo-cifras-correos" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="titulo-cifras-correos" className="text-titulo-2 font-bold">
            Cifras: {textoPeriodo}
          </h2>
          <nav aria-label="Periodo de las cifras" className="flex flex-wrap gap-2">
            {PERIODOS_CORREOS.map((periodo) => {
              const activo = periodo === filtros.periodo;
              return (
                <Link
                  key={periodo}
                  href={`/admin/correos${consultaCorreos(filtros, { periodo, pagina: 1 })}` as Route}
                  aria-current={activo ? 'page' : undefined}
                  className={`${CLASES_ENLACE_BOTON} ${activo ? 'bg-primario text-white' : 'border border-borde-fuerte text-[color:var(--admin-texto-claro)] hover:bg-white/10'}`}
                >
                  {TEXTO_PERIODO_CORREOS[periodo]}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TarjetaCifra
            titulo="Enviados"
            valor={numero(intentos)}
            detalle={`${numero(resumen.porResultado.aceptado)} entregados al proveedor`}
          />
          <TarjetaCifra
            titulo="Tasa de entrega"
            valor={textoTasa(resumen.tasa)}
            detalle="Entregados frente a enviados (sin contar los que no se enviaron)"
          />
          <TarjetaCifra
            titulo="Errores en 24 h"
            valor={numero(contadores.correosConError24h)}
            detalle="Correos con error en las últimas 24 horas"
          />
          <TarjetaCifra
            titulo="No se enviaron"
            valor={numero(resumen.porResultado.omitido)}
            detalle="Una regla decidió no enviarlos (por ejemplo, la cuenta ya estaba confirmada)"
          />
        </div>
      </section>

      <section aria-labelledby="titulo-grafico-correos" className="vidrio p-5 sm:p-6">
        <h2 id="titulo-grafico-correos" className="text-titulo-2 font-bold text-texto">
          Correos por día
        </h2>
        <p className="mb-3 mt-1 text-sm text-texto-suave">Enviados cada día de los últimos {DIAS_GRAFICO_CORREOS} días (hora de Bogotá).</p>
        <GraficoBarras
          titulo={`Correos enviados por día, últimos ${DIAS_GRAFICO_CORREOS} días`}
          descripcion={`En total, ${numero(dias.reduce((suma, dia) => suma + dia.aceptados + dia.fallidos, 0))} correos enviados en los últimos ${DIAS_GRAFICO_CORREOS} días.`}
          nombreValor="Enviados"
          puntos={dias.map((dia) => ({
            etiqueta: DIA_CORTO.format(deDia(dia.dia)),
            etiquetaLarga: DIA_LARGO.format(deDia(dia.dia)),
            valor: dia.aceptados + dia.fallidos,
          }))}
        />
        <TablaDatos
          titulo="Correos por día y resultado"
          columnas={['Día', 'Entregados', 'Rechazados o con error', 'No se enviaron']}
          filas={dias.map((dia) => ({ etiqueta: DIA_LARGO.format(deDia(dia.dia)), valores: [dia.aceptados, dia.fallidos, dia.omitidos] }))}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section aria-labelledby="titulo-tipos-correo" className="vidrio p-4 xl:col-span-2">
          <h2 id="titulo-tipos-correo" className="mb-3 text-titulo-2 font-bold text-texto">
            Por tipo ({textoPeriodo})
          </h2>
          {resumen.porTipo.length === 0 ? (
            <p className="py-4 text-center text-base text-texto-suave">No hay correos en este periodo.</p>
          ) : (
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Correos por tipo (se desplaza de lado)">
              <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                <caption className="sr-only">Correos por tipo y resultado en el periodo, de más a menos</caption>
                <thead>
                  <tr className="border-b border-borde">
                    <th scope="col" className="px-3 py-2 font-semibold text-texto">Tipo</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold text-texto">Total</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold text-texto">Entregados</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold text-texto">Rechazados o con error</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold text-texto">No se enviaron</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold text-texto">Tasa</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.porTipo.map((fila) => (
                    <tr key={fila.tipo} className="border-b border-borde last:border-0">
                      <th scope="row" className="px-3 py-2 font-normal text-texto">{enPalabras(TEXTO_TIPO_CORREO, fila.tipo)}</th>
                      <td className="px-3 py-2 text-right tabular-nums text-texto">{numero(fila.total)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-texto">{numero(fila.porResultado.aceptado)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-texto">{numero(fila.porResultado.rechazado + fila.porResultado.error)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-texto">{numero(fila.porResultado.omitido)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-texto">{textoTasa(fila.tasa)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="titulo-detalle-envio" className="vidrio space-y-4 p-4">
          <h2 id="titulo-detalle-envio" className="text-titulo-2 font-bold text-texto">
            Detalle del envío
          </h2>
          <div>
            <h3 className="text-sm font-semibold text-texto">Por qué no se enviaron</h3>
            {resumen.omitidosPorMotivo.length === 0 ? (
              <p className="mt-1 text-sm text-texto-suave">Ninguno en este periodo.</p>
            ) : (
              <dl className="mt-1 space-y-1 text-sm">
                {resumen.omitidosPorMotivo.map((fila) => (
                  <div key={fila.motivo} className="flex justify-between gap-3">
                    <dt className="text-texto-suave">{enPalabras(TEXTO_MOTIVO_OMISION, fila.motivo)}</dt>
                    <dd className="tabular-nums text-texto">{numero(fila.total)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-texto">Duración media por proveedor</h3>
            {duracionPorProveedor.length === 0 ? (
              <p className="mt-1 text-sm text-texto-suave">Sin envíos en este periodo.</p>
            ) : (
              <dl className="mt-1 space-y-1 text-sm">
                {duracionPorProveedor.map((fila) => (
                  <div key={fila.proveedor} className="flex justify-between gap-3">
                    <dt className="text-texto-suave">
                      {enPalabras(TEXTO_PROVEEDOR, fila.proveedor)} ({numero(fila.envios)} {fila.envios === 1 ? 'envío' : 'envíos'})
                    </dt>
                    <dd className="tabular-nums text-texto">{numero(fila.mediaMs)} ms</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>
      </div>

      {/* Los filtros viven en la URL: la vista se puede compartir o recargar. */}
      <form method="get" action="/admin/correos" className="vidrio grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end" aria-label="Filtros de la lista de correos">
        {filtros.periodo !== PERIODO_CORREOS_POR_DEFECTO ? <input type="hidden" name="periodo" value={filtros.periodo} /> : null}
        <label className="flex flex-col gap-1 text-sm font-medium text-texto">
          Tipo
          <select name="tipo" defaultValue={filtros.tipo ?? ''} className={CLASES_CAMPO}>
            <option value="">Todos</option>
            {TIPOS_CORREO.map((tipo) => (
              <option key={tipo} value={tipo}>
                {TEXTO_TIPO_CORREO[tipo]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-texto">
          Resultado
          <select name="resultado" defaultValue={filtros.resultado ?? ''} className={CLASES_CAMPO}>
            <option value="">Todos</option>
            {RESULTADOS_ENVIO.map((resultado) => (
              <option key={resultado} value={resultado}>
                {TEXTO_RESULTADO_ENVIO[resultado]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-texto">
          Proveedor
          <select name="proveedor" defaultValue={filtros.proveedor ?? ''} className={CLASES_CAMPO}>
            <option value="">Todos</option>
            {PROVEEDORES_CORREO.map((proveedor) => (
              <option key={proveedor} value={proveedor}>
                {TEXTO_PROVEEDOR[proveedor]}
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
        <div className="flex flex-wrap gap-2 lg:col-span-5">
          <button type="submit" className={`${CLASES_ENLACE_BOTON} bg-primario text-white hover:bg-primario-fuerte`}>
            Filtrar
          </button>
          <Link
            href={`/admin/correos${consultaCorreos({ ...filtros, tipo: null, resultado: null, proveedor: null, desde: null, hasta: null, pagina: 1 })}` as Route}
            className={`${CLASES_ENLACE_BOTON} border border-borde-fuerte text-texto hover:bg-primario-suave`}
          >
            Quitar filtros
          </Link>
        </div>
      </form>

      <section aria-labelledby="titulo-tabla-correos" className="vidrio p-4">
        <h2 id="titulo-tabla-correos" className="mb-2 text-titulo-2 font-bold text-texto">
          Registro de envíos
        </h2>
        {filas.length === 0 ? (
          <p className="py-6 text-center text-base text-texto-suave">No hay correos con estos filtros.</p>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla de correos (se desplaza de lado)">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <caption className="sr-only">Correos, del más reciente al más antiguo (hora de Bogotá)</caption>
              <thead>
                <tr className="border-b border-borde">
                  <th scope="col" className="px-3 py-2 font-semibold text-texto">Fecha y hora</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-texto">Tipo</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-texto">Destinatario</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-texto">Resultado</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-texto">Proveedor</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold text-texto">Duración</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-texto">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.id} className="border-b border-borde align-top last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-texto">{fechaHoraBogota(fila.fecha)}</td>
                    <td className="px-3 py-2 text-texto">{enPalabras(TEXTO_TIPO_CORREO, fila.tipo)}</td>
                    <td className="px-3 py-2">
                      {fila.usuarioId ? (
                        <Link
                          href={`/admin/personas/${fila.usuarioId}` as Route}
                          className="inline-flex min-h-11 items-center font-medium text-primario underline-offset-4 hover:underline"
                        >
                          {fila.destinatarioMascara}
                        </Link>
                      ) : (
                        <span className="text-texto">{fila.destinatarioMascara}</span>
                      )}
                    </td>
                    <td className={`px-3 py-2 ${fila.resultado === 'error' || fila.resultado === 'rechazado' ? 'font-semibold text-peligro' : 'text-texto'}`}>
                      {enPalabras(TEXTO_RESULTADO_ENVIO, fila.resultado)}
                    </td>
                    <td className="px-3 py-2 text-texto">{enPalabras(TEXTO_PROVEEDOR, fila.proveedor)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-texto">{fila.duracionMs === null ? '—' : `${numero(fila.duracionMs)} ms`}</td>
                    <td className="px-3 py-2 text-texto-suave">
                      {fila.motivo ? enPalabras(TEXTO_MOTIVO_OMISION, fila.motivo) : (fila.error ?? '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <nav aria-label="Páginas de la lista de correos" className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-texto">
          <p>
            {desdeFila}–{hastaFila} de {numero(total)} · página {filtros.pagina} de {paginas}
          </p>
          <div className="flex gap-2">
            {filtros.pagina > 1 ? (
              <Link href={`/admin/correos${consultaCorreos(filtros, { pagina: filtros.pagina - 1 })}` as Route} className={`${CLASES_ENLACE_BOTON} border border-borde-fuerte hover:bg-primario-suave`}>
                Anterior
              </Link>
            ) : null}
            {filtros.pagina < paginas ? (
              <Link href={`/admin/correos${consultaCorreos(filtros, { pagina: filtros.pagina + 1 })}` as Route} className={`${CLASES_ENLACE_BOTON} border border-borde-fuerte hover:bg-primario-suave`}>
                Siguiente
              </Link>
            ) : null}
          </div>
        </nav>
      </section>
    </>
  );
}
