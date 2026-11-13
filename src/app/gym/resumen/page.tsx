import { IndicadorProgreso, textoSerie } from '@/components/gym/IndicadorProgreso';
import { InsigniaTipo } from '@/components/gym/InsigniaTipo';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { exigirSesionDePagina } from '@/lib/auth/sesion';
import { obtenerResumen } from '@/lib/dataService';
import { hoyBogota, restarDias } from '@/lib/reglas/fechas';
import { esquemaResumen } from '@/lib/validacion/esquemas';

const DIAS_POR_DEFECTO = 7;

function Cifra({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <Tarjeta>
      <p className="text-2xl font-bold tabular-nums text-texto">{valor}</p>
      <p className="text-sm text-texto-suave">{etiqueta}</p>
    </Tarjeta>
  );
}

export default async function ResumenPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const { id: usuarioId } = await exigirSesionDePagina();
  const parametros = await searchParams;
  const hoy = hoyBogota();
  const periodo = esquemaResumen.safeParse(parametros);
  const { desde, hasta } = periodo.success
    ? periodo.data
    : { desde: restarDias(hoy, DIAS_POR_DEFECTO - 1), hasta: hoy };
  const resumen = await obtenerResumen(usuarioId, desde, hasta);

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-texto">Mi progreso</h1>
      <p className="mb-5 text-base text-texto-suave">Elige un periodo y mira cuántas veces entrenaste y cómo mejoró cada ejercicio.</p>

      <div className="mb-6 grid gap-4 lg:grid-cols-12">
        <Tarjeta className="lg:col-span-6">
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Campo etiqueta="Desde" type="date" name="desde" defaultValue={desde} max={hoy} />
            </div>
            <div className="flex-1">
              <Campo etiqueta="Hasta" type="date" name="hasta" defaultValue={hasta} max={hoy} />
            </div>
            <Boton type="submit" variante="secundario">
              Ver periodo
            </Boton>
          </form>
        </Tarjeta>

        <div className="grid grid-cols-2 gap-4 lg:col-span-6">
          <Cifra valor={resumen.totalSesiones} etiqueta="Sesiones" />
          <Cifra valor={resumen.ejerciciosTrabajados} etiqueta="Ejercicios trabajados" />
        </div>
      </div>

      {resumen.ejercicios.length === 0 ? (
        <EstadoVacio
          titulo="Sin sesiones en este periodo"
          descripcion="Prueba con un rango de fechas más amplio."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {resumen.ejercicios.map((ejercicio) => (
            <li key={ejercicio.id}>
              <Tarjeta className="h-full">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold text-texto">{ejercicio.nombre}</h2>
                  <div className="flex gap-2">
                    <IndicadorProgreso indicador={ejercicio.indicador} />
                    <InsigniaTipo tipo={ejercicio.tipo} />
                  </div>
                </div>
                <p className="mt-2 text-sm tabular-nums text-texto-suave">
                  {ejercicio.sesiones} {ejercicio.sesiones === 1 ? 'sesión' : 'sesiones'} · De{' '}
                  {textoSerie(ejercicio.inicial)} a {textoSerie(ejercicio.final)}
                </p>
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
