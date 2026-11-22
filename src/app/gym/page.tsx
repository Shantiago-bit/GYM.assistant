import type { Route } from 'next';
import Link from 'next/link';
import { AccesosChrono } from '@/components/inicio/AccesosChrono';
import { AnilloRacha } from '@/components/inicio/AnilloRacha';
import { BotonFlotanteEntrenar } from '@/components/inicio/BotonFlotanteEntrenar';
import { EstadoVacioInicio } from '@/components/inicio/EstadoVacioInicio';
import { TarjetaEjercicioInicio } from '@/components/inicio/TarjetaEjercicioInicio';
import { TarjetaHoy } from '@/components/inicio/TarjetaHoy';
import {
  TarjetaEstaSemana,
  TarjetaListos,
  TarjetaUltimoRecord,
} from '@/components/inicio/TarjetasProgreso';
import { TiraSemana } from '@/components/inicio/TiraSemana';
import { AvisoAccion } from '@/components/gym/AvisoAccion';
import { TarjetaAvisoDias } from '@/components/gym/TarjetaAvisoDias';
import { TarjetaCumpleanos } from '@/components/gym/TarjetaCumpleanos';
import { TarjetaEjercicio } from '@/components/gym/TarjetaEjercicio';
import { TarjetaOfertaGuia } from '@/components/guia/TarjetaOfertaGuia';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { Icono } from '@/components/ui/Icono';
import { ListaAnimada, SegmentoAnimado } from '@/components/ui/MovimientoLista';
import { exigirSesionDePagina } from '@/lib/auth/sesion';
import {
  listarEjercicios,
  listarFechasConSesion,
  obtenerDatosInicio,
  obtenerEstadoGuia,
  obtenerHistorialDias,
  obtenerPerfil,
  sesionesDe,
} from '@/lib/dataService';
import { horaBogota, saludoSegunHora } from '@/lib/reglas/admin';
import { hoyBogota } from '@/lib/reglas/fechas';
import {
  desdeParaInicio,
  estadosSemana,
  fechaCorta,
  fraseCorta,
  progresoSemana,
  recomendacionDelListado,
  resumenDeHoy,
  tarjetaSemana,
  tendenciaEjercicio,
  textoAnillo,
  textoTendencia,
  ultimoRecord,
} from '@/lib/reglas/inicio';
import { calcularEdad, esCumpleanos, nombreParaMostrar } from '@/lib/reglas/perfil';
import { calcularRacha, diaSemana, NOMBRES_DIA } from '@/lib/reglas/racha';
import { pasoDeHoy } from '@/lib/reglas/siguientePaso';

export const metadata = { title: 'Inicio · Gym Assistant' };

type Filtro = 'todos' | 'peso' | 'calistenia' | 'listos';

const FILTROS: { valor: Filtro; texto: string; href: Route }[] = [
  { valor: 'todos', texto: 'Todos', href: '/gym' },
  { valor: 'peso', texto: 'Peso', href: '/gym?tipo=peso' as Route },
  { valor: 'calistenia', texto: 'Con tu cuerpo', href: '/gym?tipo=calistenia' as Route },
  { valor: 'listos', texto: 'Listos para subir', href: '/gym?listos=1' as Route },
];

export default async function GymPage({
  searchParams,
}: {
  searchParams: Promise<{ archivados?: string; tipo?: string; listos?: string; aviso?: string }>;
}) {
  const { id: usuarioId } = await exigirSesionDePagina();
  const { archivados, tipo, listos: soloListos, aviso } = await searchParams;
  const verArchivados = archivados === '1';
  const filtro: Filtro =
    soloListos === '1' ? 'listos' : tipo === 'peso' || tipo === 'calistenia' ? tipo : 'todos';

  const hoy = hoyBogota();
  const [todos, estadoGuia, perfil, fechas, historialDias, datos] = await Promise.all([
    listarEjercicios(usuarioId, { incluirArchivados: true }),
    obtenerEstadoGuia(usuarioId),
    obtenerPerfil(usuarioId),
    listarFechasConSesion(usuarioId),
    obtenerHistorialDias(usuarioId),
    obtenerDatosInicio(usuarioId, desdeParaInicio(hoy)),
  ]);
  const avanzado = perfil?.modoAvanzado ?? false;
  const nombre = perfil ? nombreParaMostrar(perfil.nombre, perfil.apodo) : '';

  // Felicitación del día del cumpleaños (el 29 de febrero se celebra el 28 en los años no bisiestos).
  const cumpleanos =
    perfil &&
    esCumpleanos(perfil.fechaNacimiento, hoy) &&
    perfil.cumpleVistoAnio !== Number(hoy.slice(0, 4))
      ? { nombre, edad: calcularEdad(perfil.fechaNacimiento, hoy) }
      : null;
  const activos = todos.filter((ejercicio) => !ejercicio.archivado);
  const archivadosLista = todos.filter((ejercicio) => ejercicio.archivado);
  const listos = activos.filter((ejercicio) => ejercicio.listoParaSubir);
  const sinNada = todos.length === 0;
  // La oferta de la guía es solo para cuentas nuevas; las que ya tienen ejercicios la abren desde el menú.
  const mostrarOferta = sinNada && !estadoGuia.ofertaVista;

  const racha = calcularRacha(fechas, hoy, historialDias);
  const entrenoHoy = fechas.includes(hoy);
  const semana = estadosSemana({ hoy, historialDias, sesiones: datos.sesiones });
  const progreso = progresoSemana(semana);
  const textoRacha = textoAnillo(racha.actual, progreso);
  const pasoHoy = pasoDeHoy({
    ejercicios: todos,
    hoyEsDescanso: racha.hoyEsDescanso,
    entrenoHoy,
    rachaActual: racha.actual,
    proximoDia: racha.proximoDiaPlanificado
      ? (NOMBRES_DIA[diaSemana(racha.proximoDiaPlanificado)] ?? null)
      : null,
    avanzado,
  });
  const resumenHoy = entrenoHoy ? resumenDeHoy(datos.sesiones, hoy) : null;
  const estaSemana = tarjetaSemana(datos.sesiones, hoy);
  const record = ultimoRecord(datos.marcas, hoy);

  const visibles = activos.filter((ejercicio) =>
    filtro === 'listos'
      ? ejercicio.listoParaSubir
      : filtro === 'todos' || ejercicio.tipo === filtro,
  );
  const tarjetas = visibles.map((ejercicio) => {
    const sesiones = sesionesDe(datos.sesiones, ejercicio.id);
    const tendencia = tendenciaEjercicio(sesiones, ejercicio.tipo);
    return {
      clave: ejercicio.id,
      contenido: (
        <TarjetaEjercicioInicio
          ejercicio={ejercicio}
          frase={fraseCorta(recomendacionDelListado(ejercicio, sesiones), avanzado)}
          tendencia={tendencia}
          descripcionTendencia={textoTendencia(tendencia, ejercicio.tipo, avanzado)}
          avanzado={avanzado}
        />
      ),
    };
  });
  const hayNotificaciones =
    Boolean(aviso) ||
    cumpleanos !== null ||
    (perfil !== null && !perfil.avisoDiasVisto) ||
    mostrarOferta;

  return (
    <div className="anim-escalonado grid grid-cols-1 gap-4 pb-24 md:pb-0 lg:grid-cols-12 lg:gap-5">
      {/* a) Saludo y anillo de racha. */}
      <header className="flex items-center justify-between gap-4 lg:col-span-12">
        <div className="min-w-0">
          <h1 className="font-titulos text-titulo-1 font-bold text-texto">
            {saludoSegunHora(horaBogota(new Date()))}
            {nombre ? `, ${nombre}` : ''}
          </h1>
          <p className="text-sm text-texto-suave">{fechaCorta(hoy)}</p>
        </div>
        {sinNada ? null : (
          <AnilloRacha racha={racha.actual} fraccion={progreso.fraccion} texto={textoRacha} />
        )}
      </header>

      {/* Notificaciones apiladas: cumpleaños, aviso de días, oferta de la guía y avisos de acciones. */}
      {hayNotificaciones ? (
        <div className="lg:col-span-12">
          <AvisoAccion aviso={aviso} />
          {cumpleanos ? (
            <TarjetaCumpleanos nombre={cumpleanos.nombre} edad={cumpleanos.edad} />
          ) : null}
          {perfil && !perfil.avisoDiasVisto ? <TarjetaAvisoDias /> : null}
          {mostrarOferta ? <TarjetaOfertaGuia /> : null}
        </div>
      ) : null}

      {sinNada ? (
        <div className="lg:col-span-12">
          <EstadoVacioInicio />
        </div>
      ) : (
        <>
          {/* b) La semana. */}
          <section
            aria-labelledby="titulo-semana"
            data-guia="semana"
            className="rounded-tarjeta border border-borde bg-superficie p-3 shadow-suave sm:p-4 lg:col-span-5 lg:self-start"
          >
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 id="titulo-semana" className="font-semibold text-texto">
                Tu semana
              </h2>
              <p className="text-sm text-texto-suave">
                {progreso.entrenados} de {progreso.planificados} días
              </p>
            </div>
            <TiraSemana dias={semana} />
          </section>

          {/* c) Hoy. */}
          <div className="lg:col-span-7">
            <TarjetaHoy paso={pasoHoy} hoy={hoy} resumen={resumenHoy} />
          </div>

          {/* d) Tu progreso. */}
          <section
            aria-labelledby="titulo-progreso"
            data-guia="progreso"
            className="lg:col-span-12"
          >
            <h2 id="titulo-progreso" className="mb-3 font-semibold text-texto">
              Tu progreso
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <TarjetaListos
                listos={listos.map(({ id, nombre: n, tipo: t }) => ({ id, nombre: n, tipo: t }))}
              />
              <TarjetaEstaSemana actual={estaSemana.actual} semanas={estaSemana.semanas} />
              <TarjetaUltimoRecord record={record} avanzado={avanzado} />
            </div>
          </section>

          {/* e) Mis ejercicios. */}
          <section
            aria-labelledby="titulo-ejercicios"
            id="mis-ejercicios"
            className="scroll-mt-20 lg:col-span-8 xl:col-span-9"
          >
            {verArchivados ? (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2 id="titulo-ejercicios" className="text-titulo-2 font-bold text-texto">
                    Archivados
                  </h2>
                  <Link
                    href="/gym"
                    className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primario hover:underline"
                  >
                    <Icono nombre="flechaIzquierda" className="h-4 w-4" />
                    Volver a mis ejercicios
                  </Link>
                </div>
                {archivadosLista.length === 0 ? (
                  <EstadoVacio
                    titulo="No hay ejercicios archivados"
                    descripcion="Cuando archives uno, lo encontrarás aquí."
                  />
                ) : (
                  <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                    {archivadosLista.map((ejercicio) => (
                      <li key={ejercicio.id}>
                        <TarjetaEjercicio ejercicio={ejercicio} avanzado={avanzado} />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 id="titulo-ejercicios" className="text-titulo-2 font-bold text-texto">
                    Mis ejercicios
                  </h2>
                  <Link
                    href="/gym/ejercicios/nuevo"
                    aria-label="Nuevo ejercicio"
                    title="Nuevo ejercicio"
                    data-guia="nuevo-ejercicio"
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primario text-2xl font-bold text-white shadow-suave transition-[transform,box-shadow,background-color] duration-150 ease-out hover:-translate-y-px hover:bg-primario-fuerte hover:shadow-elevada active:scale-95 motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
                  >
                    <span aria-hidden="true">+</span>
                  </Link>
                </div>
                <div className="mb-4" data-guia="filtros">
                  <SegmentoAnimado
                    etiqueta="Filtrar ejercicios"
                    idIndicador="filtro-ejercicios"
                    forma="chips"
                    opciones={FILTROS.map((opcion) => ({
                      href: opcion.href,
                      texto: opcion.texto,
                      activo: opcion.valor === filtro,
                    }))}
                  />
                </div>
                {tarjetas.length === 0 ? (
                  <EstadoVacio
                    titulo={
                      filtro === 'listos'
                        ? 'Ninguno está listo para subir todavía'
                        : 'No hay ejercicios con este filtro'
                    }
                    descripcion="Prueba con otro filtro o crea un ejercicio nuevo."
                  />
                ) : (
                  <ListaAnimada
                    className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3"
                    guiaPrimero="tarjeta-ejercicio"
                    elementos={tarjetas}
                  />
                )}
                {archivadosLista.length > 0 ? (
                  <p className="mt-4 text-center">
                    <Link
                      href="/gym?archivados=1#mis-ejercicios"
                      className="inline-flex min-h-11 items-center rounded px-2 text-sm text-texto-suave underline-offset-4 hover:text-texto hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
                    >
                      Ver archivados ({archivadosLista.length})
                    </Link>
                  </p>
                ) : null}
              </>
            )}
          </section>

          {/* f) Accesos de CHRONO. */}
          <div className="lg:col-span-4 lg:self-start xl:col-span-3">
            <AccesosChrono />
          </div>

          {/* g) Botón flotante (solo móvil; se monta en <body>). */}
          <BotonFlotanteEntrenar />
        </>
      )}
    </div>
  );
}
