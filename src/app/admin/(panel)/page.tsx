import type { Metadata } from 'next';
import Link from 'next/link';
import { MedidorMeta } from '@/components/admin/MedidorMeta';
import { PanelTendencia } from '@/components/admin/PanelTendencia';
import { TarjetaIndicador } from '@/components/admin/TarjetaIndicador';
import { exigirAdminDePagina } from '@/lib/auth/admin';
import { ZONA_HORARIA } from '@/lib/config/gym';
import { obtenerEstadisticasResumen, obtenerMetaActivasMes, obtenerPerfil } from '@/lib/dataService';
import {
  completarMeses,
  cosasPorAtender,
  diasDelMes,
  horaBogota,
  mesDe,
  proyectarMeta,
  saludoSegunHora,
  variacion,
} from '@/lib/reglas/admin';
import { hoyBogota } from '@/lib/reglas/fechas';
import { nombreParaMostrar } from '@/lib/reglas/perfil';

export const metadata: Metadata = { title: 'Resumen · Administración · Gym Assistant' };

const CLASES_BOTON_CLARO =
  'inline-flex min-h-11 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-[color:var(--admin-fondo-oscuro)] hover:bg-white/90';
const CLASES_BOTON_BORDE =
  'inline-flex min-h-11 items-center justify-center rounded-full border border-white/60 px-4 text-sm font-semibold text-[color:var(--admin-texto-claro)] hover:bg-white/10';

export default async function ResumenAdminPage() {
  // Cada página repite la puerta: en Next, el layout y la página se procesan en paralelo.
  const admin = await exigirAdminDePagina();
  const ahora = new Date();
  const hoy = hoyBogota(ahora);
  const [estadisticas, metaMensual, perfil] = await Promise.all([
    obtenerEstadisticasResumen(hoy),
    obtenerMetaActivasMes(),
    obtenerPerfil(admin.id),
  ]);

  const meses = completarMeses(estadisticas.meses, hoy, 12);
  const actual = meses.at(-1)!;
  const anterior = meses.at(-2)!;
  const meta = proyectarMeta({
    activas: actual.activas,
    meta: metaMensual,
    dia: Number(hoy.slice(8, 10)),
    diasDelMes: diasDelMes(mesDe(hoy)),
  });
  const atencion = cosasPorAtender(estadisticas.pendientes);
  const nombre = perfil ? nombreParaMostrar(perfil.nombre, perfil.apodo) : 'equipo';
  const fechaLarga = new Intl.DateTimeFormat('es-CO', { dateStyle: 'full', timeZone: ZONA_HORARIA }).format(ahora);

  return (
    <>
      <section aria-labelledby="titulo-resumen" className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-[color:var(--admin-sube-texto)]">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-green-600" />
            En vivo · {estadisticas.activasHoy.toLocaleString('es-CO')}{' '}
            {estadisticas.activasHoy === 1 ? 'persona entrenó hoy' : 'personas entrenaron hoy'}
          </p>
          <h1 id="titulo-resumen" className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            {saludoSegunHora(horaBogota(ahora))}, {nombre}
          </h1>
          <p className="mt-1 text-base text-[color:var(--admin-texto-claro-suave)]">
            <span className="first-letter:uppercase">{fechaLarga}</span> ·{' '}
            {atencion.total === 0
              ? 'nada necesita tu atención'
              : `${atencion.total.toLocaleString('es-CO')} ${atencion.total === 1 ? 'cosa necesita' : 'cosas necesitan'} tu atención`}
          </p>
          {atencion.detalles.length > 0 ? (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-[color:var(--admin-texto-claro-suave)]">
              {atencion.detalles.map((detalle) => (
                <li key={detalle}>{detalle}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Descarga directa: la ruta exige la sesión de administración y deja el registro en la auditoría. */}
          <a href="/api/admin/resumen/csv" download className={CLASES_BOTON_CLARO}>
            Exportar resumen (CSV)
          </a>
          <Link href="/gym" className={CLASES_BOTON_BORDE}>
            Ir a la app
          </Link>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <PanelTendencia meses={meses} totalCuentas={estadisticas.totalCuentas} activasPeriodo={estadisticas.activasPeriodo} />
        </div>
        <MedidorMeta meta={meta} activasHoy={estadisticas.activasHoy} />
      </div>

      <section aria-labelledby="titulo-mes">
        <h2 id="titulo-mes" className="mb-3 text-xl font-bold">
          Este mes frente al anterior
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TarjetaIndicador titulo="Registros del mes" valor={actual.registros} variacion={variacion(actual.registros, anterior.registros)} />
          <TarjetaIndicador titulo="Personas activas del mes" valor={actual.activas} variacion={variacion(actual.activas, anterior.activas)} />
          <TarjetaIndicador titulo="Sesiones del mes" valor={actual.sesiones} variacion={variacion(actual.sesiones, anterior.sesiones)} />
          <TarjetaIndicador
            titulo="Uso de CHRONO (mensajes del mes)"
            valor={actual.mensajes}
            variacion={variacion(actual.mensajes, anterior.mensajes)}
          />
        </div>
      </section>
      <p className="text-sm text-[color:var(--admin-texto-claro-suave)]">
        Persona activa: registró al menos una sesión en el periodo. Fechas en hora de Bogotá. Las cifras se actualizan
        cada 5 minutos.
      </p>
    </>
  );
}
