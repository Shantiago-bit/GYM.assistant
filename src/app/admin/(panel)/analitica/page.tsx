import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { EmbudoBarras } from '@/components/admin/EmbudoBarras';
import { MapaCohortes } from '@/components/admin/MapaCohortes';
import { TarjetaCifra } from '@/components/admin/TarjetaCifra';
import { exigirAdminDePagina } from '@/lib/auth/admin';
import { estadisticasAnalitica } from '@/lib/dataService';
import {
  leerSemanasAnalitica,
  mayorCaida,
  SEMANAS_ANALITICA,
  SEMANAS_ANALITICA_POR_DEFECTO,
  TEXTO_PASO_EMBUDO,
  textoConversion,
} from '@/lib/reglas/analiticaAdmin';
import { hoyBogota } from '@/lib/reglas/fechas';

export const metadata: Metadata = { title: 'Analítica · Administración' };

const CLASES_ENLACE_BOTON =
  'inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario';
const CLASES_BOTON_CLARO = `${CLASES_ENLACE_BOTON} bg-primario text-white hover:bg-primario-fuerte`;
const DIA_LARGO = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const numero = (valor: number) => valor.toLocaleString('es-CO');
const conSemanas = (semanas: number) => (semanas === SEMANAS_ANALITICA_POR_DEFECTO ? '' : `?semanas=${semanas}`);

// Activación y retención de las personas registradas en las últimas 8 o 12 semanas. Solo cifras agregadas; las
// definiciones están en Doc/PLAN_GYM.md, sección 22.
export default async function AnaliticaAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirAdminDePagina();
  const semanas = leerSemanasAnalitica((await searchParams).semanas);
  const a = await estadisticasAnalitica(hoyBogota(), semanas);
  const [registradas, , , primeraSesion, dosSemanas] = a.embudo;
  const caida = mayorCaida(a.embudo);
  const desde = DIA_LARGO.format(new Date(`${a.desde}T00:00:00Z`));

  return (
    <>
      <section aria-labelledby="titulo-analitica" className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 id="titulo-analitica" className="text-titulo-1 font-bold">
            Analítica
          </h1>
          <p className="text-base text-[color:var(--admin-texto-claro-suave)]">
            Cuántas de las personas registradas desde el {desde} empiezan a entrenar y cuántas vuelven las semanas siguientes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <nav aria-label="Periodo de la analítica" className="flex flex-wrap gap-2">
            {SEMANAS_ANALITICA.map((opcion) => {
              const activo = opcion === semanas;
              return (
                <Link
                  key={opcion}
                  href={`/admin/analitica${conSemanas(opcion)}` as Route}
                  aria-current={activo ? 'page' : undefined}
                  className={`${CLASES_ENLACE_BOTON} ${activo ? 'bg-primario text-white' : 'border border-borde-fuerte text-[color:var(--admin-texto-claro)] hover:bg-white/10'}`}
                >
                  Últimas {opcion} semanas
                </Link>
              );
            })}
          </nav>
          {/* Descarga directa: la ruta exige la sesión de administración y deja el registro en la auditoría. */}
          <a href={`/api/admin/analitica/csv?semanas=${semanas}`} download className={CLASES_BOTON_CLARO}>
            Exportar CSV
          </a>
        </div>
      </section>

      <section aria-labelledby="titulo-cifras-analitica" className="space-y-3">
        <h2 id="titulo-cifras-analitica" className="text-titulo-2 font-bold">
          En las últimas {semanas} semanas
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TarjetaCifra titulo="Personas registradas" valor={numero(registradas!.cantidad)} detalle={`Desde el ${desde}`} />
          <TarjetaCifra
            titulo="Conversión"
            valor={textoConversion(a.conversion)}
            detalle={`${numero(primeraSesion!.cantidad)} registraron su primera sesión`}
          />
          <TarjetaCifra
            titulo="Vuelven a la semana siguiente"
            valor={a.retencionPromedio[0] === null || a.retencionPromedio[0] === undefined ? '—' : `${numero(a.retencionPromedio[0])} %`}
            detalle="Promedio de las cohortes con esa semana cerrada"
          />
          <TarjetaCifra
            titulo="Entrenaron 2 semanas o más"
            valor={numero(dosSemanas!.cantidad)}
            detalle={dosSemanas!.delTotal === null ? 'Sin registros en el periodo' : `${numero(dosSemanas!.delTotal)} % de las registradas`}
          />
        </div>
      </section>

      <section aria-labelledby="titulo-embudo" className="vidrio p-5 sm:p-6">
        <h2 id="titulo-embudo" className="text-titulo-2 font-bold text-texto">
          Embudo de activación
        </h2>
        <p className="mb-4 mt-1 text-sm text-texto-suave">
          {registradas!.cantidad === 0
            ? 'Nadie se registró en este periodo.'
            : caida
              ? `La mayor caída está en «${TEXTO_PASO_EMBUDO[caida.paso]}»: ${numero(caida.perdidas)} ${caida.perdidas === 1 ? 'persona no llegó' : 'personas no llegaron'} a ese paso.`
              : 'Todas las personas registradas llegaron hasta el último paso.'}
        </p>
        <EmbudoBarras embudo={a.embudo} titulo="Pasos del embudo de activación" />
      </section>

      <section aria-labelledby="titulo-cohortes" className="vidrio p-5 sm:p-6">
        <h2 id="titulo-cohortes" className="text-titulo-2 font-bold text-texto">
          Retención por cohortes
        </h2>
        <p className="mb-3 mt-1 text-sm text-texto-suave">
          Cada fila es la semana (de lunes a domingo) en que se registraron las personas; cada columna, el porcentaje de
          ellas que registró al menos una sesión esa semana siguiente. Más oscuro es más alto; el asterisco (*) marca la
          semana en curso, que todavía puede subir, y el punto (·) las semanas que aún no llegan.
        </p>
        <MapaCohortes cohortes={a.cohortes} promedio={a.retencionPromedio} titulo="Retención por cohortes semanales" />
      </section>

      <p className="text-sm text-[color:var(--admin-texto-claro-suave)]">
        Fechas en hora de Bogotá. Las cifras se actualizan cada 5 minutos. El CSV solo tiene cifras y queda en la auditoría.
      </p>
    </>
  );
}
