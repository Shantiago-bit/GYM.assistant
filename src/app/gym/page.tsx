import type { Route } from 'next';
import Link from 'next/link';
import { AvisoAccion } from '@/components/gym/AvisoAccion';
import { TarjetaAvisoDias } from '@/components/gym/TarjetaAvisoDias';
import { TarjetaCumpleanos } from '@/components/gym/TarjetaCumpleanos';
import { TarjetaEjercicio } from '@/components/gym/TarjetaEjercicio';
import { TarjetaOfertaGuia } from '@/components/guia/TarjetaOfertaGuia';
import { clasesBoton } from '@/components/ui/Boton';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { exigirSesionDePagina } from '@/lib/auth/sesion';
import { listarEjercicios, obtenerEstadoGuia, obtenerPerfil } from '@/lib/dataService';
import type { TipoEjercicio } from '@/lib/datos/tipos';
import { hoyBogota } from '@/lib/reglas/fechas';
import { calcularEdad, esCumpleanos, nombreParaMostrar } from '@/lib/reglas/perfil';

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
  searchParams: Promise<{ archivados?: string; tipo?: string; aviso?: string }>;
}) {
  const { id: usuarioId, email } = await exigirSesionDePagina();
  const { archivados, tipo: tipoParam, aviso } = await searchParams;
  const verArchivados = archivados === '1';
  const tipo: FiltroTipo = tipoParam === 'peso' || tipoParam === 'calistenia' ? tipoParam : 'todos';

  // Las estadísticas usan solo los activos; la lista respeta los filtros elegidos.
  const [todos, estadoGuia, perfil] = await Promise.all([
    listarEjercicios(usuarioId, { incluirArchivados: true }),
    obtenerEstadoGuia(usuarioId),
    obtenerPerfil(usuarioId),
  ]);
  // Felicitación del día del cumpleaños (el 29 de febrero se celebra el 28 en los años no bisiestos).
  const hoy = hoyBogota();
  const cumpleanos =
    perfil && esCumpleanos(perfil.fechaNacimiento, hoy) && perfil.cumpleVistoAnio !== Number(hoy.slice(0, 4))
      ? { nombre: nombreParaMostrar(perfil.nombre, perfil.apodo), edad: calcularEdad(perfil.fechaNacimiento, hoy) }
      : null;
  const activos = todos.filter((ejercicio) => !ejercicio.archivado);
  const ejercicios = todos.filter(
    (ejercicio) =>
      ejercicio.archivado === verArchivados && (tipo === 'todos' || ejercicio.tipo === tipo),
  );

  const totalSesiones = activos.reduce((total, ejercicio) => total + ejercicio.totalSesiones, 0);
  const listos = activos.filter((ejercicio) => ejercicio.listoParaSubir).length;
  const sinNada = todos.length === 0;
  // La oferta de la guía es solo para cuentas nuevas; las que ya tienen ejercicios la abren desde el menú.
  const mostrarOferta = sinNada && !estadoGuia.ofertaVista;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-texto">Tus ejercicios</h1>
          <p className="truncate text-sm text-texto-suave">
            Datos privados de <span className="font-medium text-texto">{email}</span>
          </p>
        </div>
        <Link href="/gym/ejercicios/nuevo" className={clasesBoton()} data-guia="nuevo-ejercicio">
          + Nuevo ejercicio
        </Link>
      </div>

      <AvisoAccion aviso={aviso} />
      {cumpleanos ? <TarjetaCumpleanos nombre={cumpleanos.nombre} edad={cumpleanos.edad} /> : null}
      {perfil && !perfil.avisoDiasVisto ? <TarjetaAvisoDias /> : null}
      {mostrarOferta ? <TarjetaOfertaGuia /> : null}

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
          <section aria-label="Resumen" className="mb-5 grid grid-cols-3 gap-3" data-guia="estadisticas">
            <Estadistica valor={activos.length} etiqueta="Ejercicios activos" />
            <Estadistica valor={totalSesiones} etiqueta="Sesiones registradas" />
            <Estadistica valor={listos} etiqueta="Listos para subir" destacada={listos > 0} />
          </section>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3" data-guia="filtros">
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
              {ejercicios.map((ejercicio, indice) => (
                <li key={ejercicio.id} data-guia={indice === 0 ? 'tarjeta-ejercicio' : undefined}>
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
