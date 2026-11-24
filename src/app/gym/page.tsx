import { cookies } from 'next/headers';
import Link from 'next/link';
import { AccesosChrono } from '@/components/inicio/AccesosChrono';
import { Icono } from '@/components/ui/Icono';
import { ListaEjercicios } from '@/components/inicio/ListaEjercicios';
import { AnilloRacha } from '@/components/inicio/AnilloRacha';
import { EstadoVacioInicio } from '@/components/inicio/EstadoVacioInicio';
import { TarjetaEjercicioInicio } from '@/components/inicio/TarjetaEjercicioInicio';
import { TarjetaHoy } from '@/components/inicio/TarjetaHoy';
import {
  TarjetaEstaSemana,
  TarjetaListos,
  TarjetaUltimoRecord,
} from '@/components/inicio/TarjetasProgreso';
import { AvisoMes, COOKIE_MES_CERRADO } from '@/components/inicio/AvisoMes';
import { TarjetaSemanaPasada } from '@/components/inicio/TarjetaSemanaPasada';
import { TiraSemana } from '@/components/inicio/TiraSemana';
import { AvisoAccion } from '@/components/gym/AvisoAccion';
import { TarjetaAvisoDias } from '@/components/gym/TarjetaAvisoDias';
import { TarjetaCumpleanos } from '@/components/gym/TarjetaCumpleanos';
import { TarjetaEjercicio } from '@/components/gym/TarjetaEjercicio';
import { TarjetaOfertaGuia } from '@/components/guia/TarjetaOfertaGuia';
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
import { mesAnterior, mesDeFecha, mesDelAviso } from '@/lib/reglas/resumenMes';
import { mostrarTarjetaSemana, resumenSemanaAnterior } from '@/lib/reglas/semana';
import { pasoDeHoy } from '@/lib/reglas/siguientePaso';
import { rachaEnRiesgo } from '@/lib/reglas/llama';
import { estadoConstelacion } from '@/lib/reglas/constelacion';
import { CieloConstelacion } from '@/components/inicio/CieloConstelacion';
import { TextoConstelacion } from '@/components/inicio/TextoConstelacion';
import { IntroAgon } from '@/components/marca/IntroAgon';

export const metadata = { title: 'Inicio' };

export default async function GymPage({
  searchParams,
}: {
  // ?tipo, ?listos y ?archivados los lee ListaEjercicios en el navegador.
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { id: usuarioId } = await exigirSesionDePagina();
  const { aviso } = await searchParams;
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
  // El cielo del fondo: la constelación de la semana según los días planificados ya entrenados.
  const constelacion = estadoConstelacion({ hoy, historialDias, fechasConSesion: fechas });
  const record = ultimoRecord(datos.marcas, hoy);

  // Todas las tarjetas activas: el filtro elegido se aplica en el navegador (ListaEjercicios).
  const tarjetas = activos.map((ejercicio) => {
    const sesiones = sesionesDe(datos.sesiones, ejercicio.id);
    const tendencia = tendenciaEjercicio(sesiones, ejercicio.tipo);
    return {
      clave: ejercicio.id,
      tipo: ejercicio.tipo,
      listo: ejercicio.listoParaSubir,
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
  // "Tu semana": desde el lunes, el resumen de la semana anterior (reglas, no IA), hasta que se cierre.
  const semanaPasada =
    perfil && mostrarTarjetaSemana(hoy, perfil.semanaCerrada)
      ? resumenSemanaAnterior({
          hoy,
          sesiones: datos.sesiones,
          marcas: datos.marcas,
          listos: listos.map(({ id, nombre: n }) => ({ id, nombre: n })),
          activos: activos.map((ejercicio) => ejercicio.id),
          enDescarga: activos
            .filter(
              (ejercicio) =>
                recomendacionDelListado(ejercicio, sesionesDe(datos.sesiones, ejercicio.id))?.accion === 'bajar_peso',
            )
            .map((ejercicio) => ejercicio.id),
        })
      : null;
  // "Tu mes de … está listo": la primera semana del mes siguiente, si ese mes tuvo sesiones y no se cerró.
  const mesAviso = mesDelAviso(
    hoy,
    (await cookies()).get(COOKIE_MES_CERRADO)?.value ?? null,
    fechas.some((fecha) => mesDeFecha(fecha) === mesAnterior(mesDeFecha(hoy))),
  );
  const hayNotificaciones =
    Boolean(aviso) ||
    cumpleanos !== null ||
    (perfil !== null && !perfil.avisoDiasVisto) ||
    mostrarOferta ||
    semanaPasada !== null ||
    mesAviso !== null;

  return (
    <div className="anim-escalonado grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
      {/* a) Saludo y anillo de racha. */}
      <header className="velo-cielo flex items-center justify-between gap-4 rounded-boton lg:col-span-12">
        <div className="min-w-0">
          <h1 className="font-titulos text-titulo-1 font-bold text-texto">
            {saludoSegunHora(horaBogota(new Date()))}
            {nombre ? `, ${nombre}` : ''}
          </h1>
          <p className="text-sm text-texto-suave">{fechaCorta(hoy)}</p>
          <TextoConstelacion estado={constelacion} />
        </div>
        {sinNada ? null : (
          <AnilloRacha
            racha={racha.actual}
            fraccion={progreso.fraccion}
            texto={textoRacha}
            enRiesgo={rachaEnRiesgo({ racha: racha.actual, hoyEsDescanso: racha.hoyEsDescanso, entrenoHoy, hora: horaBogota(new Date()) })}
          />
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
          {mesAviso ? <AvisoMes mes={mesAviso} /> : null}
          {semanaPasada ? <TarjetaSemanaPasada resumen={semanaPasada} /> : null}
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
            <div className="velo-cielo mb-3 flex items-center justify-between gap-3 rounded-boton">
              <h2 id="titulo-progreso" className="font-semibold text-texto">
                Tu progreso
              </h2>
              {/* <a>: /gym/mi-mes se pide al servidor con su consulta (ver EnlaceLocal y el loading.tsx de /gym). */}
              <a
                href="/gym/mi-mes"
                data-guia="enlace-mes"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-boton px-2 text-sm font-semibold text-primario hover:bg-primario-suave focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
              >
                Tu mes en el gym
                <Icono nombre="flechaDerecha" className="h-4 w-4" />
              </a>
            </div>
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
            <ListaEjercicios
              activos={tarjetas}
              archivados={archivadosLista.map((ejercicio) => ({
                clave: ejercicio.id,
                contenido: <TarjetaEjercicio ejercicio={ejercicio} avanzado={avanzado} />,
              }))}
              botonNuevo={
                <Link
                  href="/gym/ejercicios/nuevo"
                  aria-label="Nuevo ejercicio"
                  title="Nuevo ejercicio"
                  data-guia="nuevo-ejercicio"
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primario text-2xl font-bold text-white shadow-suave transition-[transform,box-shadow,background-color] duration-150 ease-out hover:-translate-y-px hover:bg-primario-fuerte hover:shadow-elevada active:scale-95 motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
                >
                  <span aria-hidden="true">+</span>
                </Link>
              }
            />
          </section>

          {/* f) Accesos de CHRONO. */}
          <div className="lg:col-span-4 lg:self-start xl:col-span-3">
            <AccesosChrono />
          </div>
        </>
      )}
      <CieloConstelacion estado={constelacion} />
      <IntroAgon />
    </div>
  );
}
