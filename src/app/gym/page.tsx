import type { Route } from 'next';
import Link from 'next/link';
import { TarjetaEjercicio } from '@/components/gym/TarjetaEjercicio';
import { clasesBoton } from '@/components/ui/Boton';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { exigirSesionDePagina } from '@/lib/auth/sesion';
import { listarEjercicios } from '@/lib/dataService';
import type { TipoEjercicio } from '@/lib/datos/tipos';

type FiltroTipo = 'todos' | TipoEjercicio;

const FILTROS_TIPO: { valor: FiltroTipo; texto: string }[] = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'peso', texto: 'Peso' },
  { valor: 'calistenia', texto: 'Calistenia' },
];

function urlListado(tipo: FiltroTipo, archivados: boolean): Route {
  const params = new URLSearchParams();
  if (tipo !== 'todos') params.set('tipo', tipo);
  if (archivados) params.set('archivados', '1');
  const consulta = params.toString();
  return (consulta ? `/gym?${consulta}` : '/gym') as Route;
}

function Estadistica({
  valor,
  etiqueta,
  destacada,
}: {
  valor: number;
  etiqueta: string;
  destacada?: boolean;
}) {
  return (
    <div
      className={`rounded-gym border px-3 py-3 ${destacada ? 'border-subir bg-primario-suave' : 'border-borde bg-superficie'}`}
    >
      <p className="text-2xl font-bold tabular-nums text-texto">{valor}</p>
      <p className="text-xs font-medium text-texto-suave">{etiqueta}</p>
    </div>
  );
}

function Segmento({
  opciones,
  etiqueta,
}: {
  etiqueta: string;
  opciones: { href: Route; texto: string; activo: boolean }[];
}) {
  return (
    <nav
      aria-label={etiqueta}
      className="inline-flex rounded-gym border border-borde bg-superficie p-1"
    >
      {opciones.map((opcion) => (
        <Link
          key={opcion.texto}
          href={opcion.href}
          aria-current={opcion.activo ? 'page' : undefined}
          className="rounded-[7px] px-3 py-1.5 text-sm font-medium text-texto-suave transition hover:text-texto aria-[current=page]:bg-primario aria-[current=page]:text-white"
        >
          {opcion.texto}
        </Link>
      ))}
    </nav>
  );
}

export default async function GymPage({
  searchParams,
}: {
  searchParams: Promise<{ archivados?: string; tipo?: string }>;
}) {
  const { id: usuarioId, email } = await exigirSesionDePagina();
  const { archivados, tipo: tipoParam } = await searchParams;
  const verArchivados = archivados === '1';
  const tipo: FiltroTipo = tipoParam === 'peso' || tipoParam === 'calistenia' ? tipoParam : 'todos';

  // Las estadísticas usan solo los activos; la lista respeta los filtros elegidos.
  const todos = await listarEjercicios(usuarioId, { incluirArchivados: true });
  const activos = todos.filter((ejercicio) => !ejercicio.archivado);
  const ejercicios = todos.filter(
    (ejercicio) =>
      ejercicio.archivado === verArchivados && (tipo === 'todos' || ejercicio.tipo === tipo),
  );

  const totalSesiones = activos.reduce((total, ejercicio) => total + ejercicio.totalSesiones, 0);
  const listos = activos.filter((ejercicio) => ejercicio.listoParaSubir).length;
  const sinNada = todos.length === 0;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-texto">Tus ejercicios</h1>
          <p className="truncate text-sm text-texto-suave">
            Datos privados de <span className="font-medium text-texto">{email}</span>
          </p>
        </div>
        <Link href="/gym/ejercicios/nuevo" className={clasesBoton()}>
          + Nuevo ejercicio
        </Link>
      </div>

      {sinNada ? (
        <EstadoVacio
          titulo="Aún no tienes ejercicios"
          descripcion="Crea tu primer ejercicio, registra la prueba inicial y la app te dirá cuándo subir el peso."
        >
          <Link href="/gym/ejercicios/nuevo" className={clasesBoton()}>
            Crear mi primer ejercicio
          </Link>
        </EstadoVacio>
      ) : (
        <>
          <section aria-label="Resumen" className="mb-5 grid grid-cols-3 gap-3">
            <Estadistica valor={activos.length} etiqueta="Ejercicios activos" />
            <Estadistica valor={totalSesiones} etiqueta="Sesiones registradas" />
            <Estadistica valor={listos} etiqueta="Listos para subir" destacada={listos > 0} />
          </section>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Segmento
              etiqueta="Filtrar por tipo"
              opciones={FILTROS_TIPO.map((filtro) => ({
                href: urlListado(filtro.valor, verArchivados),
                texto: filtro.texto,
                activo: filtro.valor === tipo,
              }))}
            />
            <Segmento
              etiqueta="Estado"
              opciones={[
                { href: urlListado(tipo, false), texto: 'Activos', activo: !verArchivados },
                { href: urlListado(tipo, true), texto: 'Archivados', activo: verArchivados },
              ]}
            />
          </div>

          {ejercicios.length === 0 ? (
            <EstadoVacio
              titulo={
                verArchivados ? 'No hay ejercicios archivados' : 'No hay ejercicios con este filtro'
              }
              descripcion="Prueba con otro filtro o crea un ejercicio nuevo."
            />
          ) : (
            <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {ejercicios.map((ejercicio) => (
                <li key={ejercicio.id}>
                  <TarjetaEjercicio ejercicio={ejercicio} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
