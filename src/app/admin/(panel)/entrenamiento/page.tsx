import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { GraficoBarras } from '@/components/admin/graficos/GraficoBarras';
import { TablaDatos } from '@/components/admin/graficos/TablaDatos';
import { TarjetaCifra } from '@/components/admin/TarjetaCifra';
import { exigirAdminDePagina } from '@/lib/auth/admin';
import { UMBRAL_ANONIMATO } from '@/lib/config/gym';
import { estadisticasEntrenamiento } from '@/lib/dataService';
import {
  etiquetaHora,
  leerPeriodoEntrenamiento,
  masFrecuente,
  NOMBRE_DIA_CORTO,
  NOMBRE_DIA_SEMANA,
  PERIODO_ENTRENAMIENTO_POR_DEFECTO,
  PERIODOS_ENTRENAMIENTO,
  TEXTO_PERIODO_ENTRENAMIENTO,
  TEXTO_TIPO_EJERCICIO,
} from '@/lib/reglas/entrenamientoAdmin';
import { hoyBogota } from '@/lib/reglas/fechas';

export const metadata: Metadata = { title: 'Entrenamiento · Administración' };

const CLASES_ENLACE_BOTON =
  'inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario';
const numero = (valor: number) => valor.toLocaleString('es-CO');
// Los nombres llegan normalizados (minúsculas, sin tildes): solo se pone la primera en mayúscula.
const conMayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

// Cómo se entrena en toda la plataforma: solo cifras agregadas. Ningún dato permite ver a una persona; un
// ejercicio solo aparece por su nombre si lo usan al menos UMBRAL_ANONIMATO cuentas distintas.
export default async function EntrenamientoAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirAdminDePagina();
  const periodo = leerPeriodoEntrenamiento((await searchParams).periodo);
  const e = await estadisticasEntrenamiento(hoyBogota(), periodo);
  const textoPeriodo = TEXTO_PERIODO_ENTRENAMIENTO[periodo].toLowerCase();
  const diaFrecuente = masFrecuente(e.porDiaSemana);
  const horaFrecuente = masFrecuente(e.porHora);

  return (
    <>
      <section aria-labelledby="titulo-entrenamiento" className="space-y-1">
        <h1 id="titulo-entrenamiento" className="text-titulo-1 font-bold">
          Entrenamiento
        </h1>
        <p className="text-base text-[color:var(--admin-texto-claro-suave)]">
          Cómo se entrena en toda la plataforma. Solo cifras de conjunto: nada de esta página identifica a una persona.
        </p>
      </section>

      <section aria-labelledby="titulo-cifras-entrenamiento" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="titulo-cifras-entrenamiento" className="text-titulo-2 font-bold">
            Cifras: {textoPeriodo}
          </h2>
          <nav aria-label="Periodo de las cifras" className="flex flex-wrap gap-2">
            {PERIODOS_ENTRENAMIENTO.map((opcion) => {
              const activo = opcion === periodo;
              return (
                <Link
                  key={opcion}
                  href={(opcion === PERIODO_ENTRENAMIENTO_POR_DEFECTO ? '/admin/entrenamiento' : `/admin/entrenamiento?periodo=${opcion}`) as Route}
                  aria-current={activo ? 'page' : undefined}
                  className={`${CLASES_ENLACE_BOTON} ${activo ? 'bg-primario text-white' : 'border border-borde-fuerte text-[color:var(--admin-texto-claro)] hover:bg-white/10'}`}
                >
                  {TEXTO_PERIODO_ENTRENAMIENTO[opcion]}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TarjetaCifra titulo="Sesiones registradas" valor={numero(e.sesiones)} detalle={`${numero(e.series)} series en total`} />
          <TarjetaCifra
            titulo="Series por sesión"
            valor={e.promedioSeries.toLocaleString('es-CO', { maximumFractionDigits: 1 })}
            detalle="Promedio del periodo"
          />
          <TarjetaCifra
            titulo="Ejercicios activos"
            valor={numero(e.reparto.activos)}
            detalle={`${numero(e.reparto.archivados)} archivados · ${numero(e.reparto.total)} en total (hoy)`}
          />
          <TarjetaCifra
            titulo="Día con más sesiones"
            valor={diaFrecuente ? conMayuscula(NOMBRE_DIA_SEMANA[diaFrecuente.dia - 1]!) : '—'}
            detalle={diaFrecuente ? `${numero(diaFrecuente.sesiones)} sesiones en el periodo` : 'Sin sesiones en el periodo'}
          />
        </div>
      </section>

      <section aria-labelledby="titulo-ranking" className="vidrio p-4">
        <h2 id="titulo-ranking" className="text-titulo-2 font-bold text-texto">
          Ejercicios más usados
        </h2>
        <p id="nota-anonimato" className="mb-3 mt-1 text-sm text-texto-suave">
          Solo se muestran ejercicios que usan al menos {UMBRAL_ANONIMATO} cuentas. Los nombres se agrupan sin
          mayúsculas, tildes ni espacios de más.
        </p>
        {e.populares.length === 0 ? (
          <p className="py-4 text-center text-base text-texto-suave">
            Todavía ningún ejercicio lo usan {UMBRAL_ANONIMATO} cuentas o más en este periodo.
          </p>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Ranking de ejercicios (se desplaza de lado)">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm" aria-describedby="nota-anonimato">
              <caption className="sr-only">Ejercicios más usados en el periodo, por cuentas y luego por sesiones</caption>
              <thead>
                <tr className="border-b border-borde">
                  <th scope="col" className="px-3 py-2 text-right font-semibold text-texto">Puesto</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-texto">Ejercicio</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold text-texto">Cuentas</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold text-texto">Sesiones</th>
                </tr>
              </thead>
              <tbody>
                {e.populares.map((fila, indice) => (
                  <tr key={fila.nombre} className="border-b border-borde last:border-0">
                    <td className="px-3 py-2 text-right tabular-nums text-texto">{indice + 1}</td>
                    <th scope="row" className="px-3 py-2 font-normal text-texto">{conMayuscula(fila.nombre)}</th>
                    <td className="px-3 py-2 text-right tabular-nums text-texto">{numero(fila.cuentas)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-texto">{numero(fila.sesiones)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="titulo-dias" className="vidrio p-5 sm:p-6">
          <h2 id="titulo-dias" className="text-titulo-2 font-bold text-texto">
            Sesiones por día de la semana
          </h2>
          <p className="mb-3 mt-1 text-sm text-texto-suave">Según la fecha de cada sesión ({textoPeriodo}).</p>
          <GraficoBarras
            titulo="Sesiones por día de la semana"
            descripcion={
              diaFrecuente
                ? `El día con más sesiones es el ${NOMBRE_DIA_SEMANA[diaFrecuente.dia - 1]}, con ${numero(diaFrecuente.sesiones)}.`
                : 'No hay sesiones en el periodo.'
            }
            nombreValor="Sesiones"
            puntos={e.porDiaSemana.map((fila) => ({
              etiqueta: NOMBRE_DIA_CORTO[fila.dia - 1]!,
              etiquetaLarga: NOMBRE_DIA_SEMANA[fila.dia - 1]!,
              valor: fila.sesiones,
            }))}
          />
        </section>

        <section aria-labelledby="titulo-horas" className="vidrio p-5 sm:p-6">
          <h2 id="titulo-horas" className="text-titulo-2 font-bold text-texto">
            Sesiones por hora de registro
          </h2>
          <p className="mb-3 mt-1 text-sm text-texto-suave">
            Hora de Bogotá en que se guardó cada sesión; puede no ser la hora en que se entrenó.
          </p>
          <GraficoBarras
            titulo="Sesiones por hora de registro"
            descripcion={
              horaFrecuente
                ? `La hora con más registros es las ${etiquetaHora(horaFrecuente.hora)}, con ${numero(horaFrecuente.sesiones)}.`
                : 'No hay sesiones en el periodo.'
            }
            nombreValor="Sesiones"
            puntos={e.porHora.map((fila) => ({ etiqueta: String(fila.hora), etiquetaLarga: etiquetaHora(fila.hora), valor: fila.sesiones }))}
          />
        </section>
      </div>

      <section aria-labelledby="titulo-tipos" className="vidrio p-5 sm:p-6">
        <h2 id="titulo-tipos" className="text-titulo-2 font-bold text-texto">
          Reparto por tipo de ejercicio
        </h2>
        <p className="mb-3 mt-1 text-sm text-texto-suave">Todos los ejercicios que existen hoy, activos y archivados.</p>
        <GraficoBarras
          titulo="Ejercicios por tipo"
          descripcion={e.reparto.porTipo
            .map((tipo) => `${TEXTO_TIPO_EJERCICIO[tipo.tipo]}: ${numero(tipo.total)} (${tipo.porcentaje} %)`)
            .join('. ')}
          nombreValor="Ejercicios"
          puntos={e.reparto.porTipo.map((tipo) => ({
            etiqueta: `${TEXTO_TIPO_EJERCICIO[tipo.tipo]} (${tipo.porcentaje} %)`,
            etiquetaLarga: TEXTO_TIPO_EJERCICIO[tipo.tipo],
            valor: tipo.total,
          }))}
        />
        <TablaDatos
          titulo="Ejercicios por tipo y estado"
          columnas={['Tipo', 'Total', 'Activos', 'Archivados', 'Porcentaje']}
          filas={e.reparto.porTipo.map((tipo) => ({
            etiqueta: TEXTO_TIPO_EJERCICIO[tipo.tipo],
            valores: [tipo.total, tipo.activos, tipo.archivados, `${tipo.porcentaje} %`],
          }))}
        />
      </section>

      <p className="text-sm text-[color:var(--admin-texto-claro-suave)]">
        Fechas en hora de Bogotá. Las cifras se actualizan cada 5 minutos.
      </p>
    </>
  );
}
