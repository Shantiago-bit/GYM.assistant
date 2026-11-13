import Link from 'next/link';
import { AvisoAccion } from '@/components/gym/AvisoAccion';
import { BotonArchivar } from '@/components/gym/BotonArchivar';
import { BotonEliminar } from '@/components/gym/BotonEliminar';
import { BotonRestaurar } from '@/components/gym/BotonRestaurar';
import { EditarEnfoque } from '@/components/gym/EditarEnfoque';
import { EditarNivel } from '@/components/gym/EditarNivel';
import { HistorialSesiones } from '@/components/gym/HistorialSesiones';
import { InsigniaTipo } from '@/components/gym/InsigniaTipo';
import { Progreso1RM } from '@/components/gym/Progreso1RM';
import { estadoActual } from '@/components/gym/TarjetaEjercicio';
import { TarjetaRecomendacion } from '@/components/gym/TarjetaRecomendacion';
import { TarjetaSiguientePaso } from '@/components/gym/TarjetaSiguientePaso';
import { TendenciaProgreso } from '@/components/gym/TendenciaProgreso';
import { Insignia } from '@/components/ui/Insignia';
import { MenuMasOpciones } from '@/components/ui/MenuMasOpciones';
import { Termino } from '@/components/ui/Termino';
import { obtenerPerfil } from '@/lib/dataService';
import { exigirSesionDePagina } from '@/lib/auth/sesion';
import { textoEnfoque } from '@/lib/reglas/ejercicio';
import { textoMetodo } from '@/lib/reglas/metodos';
import { siguientePaso, type EstadoEjercicio } from '@/lib/reglas/siguientePaso';
import { GLOSARIO } from '@/lib/textos/glosario';
import { cargarEjercicio } from './cargar';

export default async function DetalleEjercicioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { id } = await params;
  const { aviso } = await searchParams;
  const { id: usuarioId } = await exigirSesionDePagina();
  const [{ ejercicio, tienePruebaInicial, sesiones, recomendacion, plan }, perfil] = await Promise.all([
    cargarEjercicio(id),
    obtenerPerfil(usuarioId),
  ]);
  const avanzado = perfil?.modoAvanzado ?? false;
  const [min, max] = ejercicio.rango;
  const totalSeries = sesiones.reduce((total, sesion) => total + sesion.series.length, 0);
  const totalSesiones = `${sesiones.length} ${sesiones.length === 1 ? 'sesión' : 'sesiones'}`;
  // Antes de la primera medición, un ejercicio de peso del modo sencillo tiene 0 kg de referencia.
  const actual =
    ejercicio.tipo === 'peso' && !tienePruebaInicial && !ejercicio.pesoRefGramos ? 'Peso por medir' : estadoActual(ejercicio);

  // Un solo paso siguiente: la prueba inicial si falta; si no, anotar la próxima sesión.
  const datos = { id, nombre: ejercicio.nombre, tipo: ejercicio.tipo, metodo: ejercicio.metodo, rango: ejercicio.rango };
  const estado: EstadoEjercicio = !tienePruebaInicial
    ? { estado: 'sin_prueba', ejercicio: datos }
    : sesiones.length <= 1
      ? { estado: 'sin_sesiones', ejercicio: datos, recomendacion }
      : { estado: 'con_recomendacion', ejercicio: datos, recomendacion };
  const paso = siguientePaso(estado, avanzado);

  return (
    <>
      <AvisoAccion aviso={aviso} />
      <Link
        href="/gym"
        className="inline-flex min-h-11 items-center text-sm font-medium text-primario underline-offset-4 hover:underline"
      >
        Volver a mis ejercicios
      </Link>

      <div className="mb-6 mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-texto lg:text-3xl">{ejercicio.nombre}</h1>
            <InsigniaTipo tipo={ejercicio.tipo} />
            <Insignia>{avanzado ? textoEnfoque(ejercicio.enfoque) : GLOSARIO[ejercicio.enfoque].llano}</Insignia>
            {avanzado || ejercicio.metodo !== 'rectas' ? <Insignia>{textoMetodo(ejercicio.metodo)}</Insignia> : null}
            {ejercicio.archivado ? <Insignia>Archivado</Insignia> : null}
          </div>
          {avanzado ? (
            <p className="mt-1 flex flex-wrap items-center text-sm tabular-nums text-texto-suave">
              {actual} ·&nbsp;
              <Termino id="rango">
                Rango {min}–{max} reps
              </Termino>
              &nbsp;·&nbsp;
              <Termino id="meta">Meta {ejercicio.metaReps} reps</Termino>
              &nbsp;· {totalSesiones}
            </p>
          ) : (
            <p className="mt-1 text-base tabular-nums text-texto-suave">
              {actual} · Repeticiones objetivo: {min} a {max} · {totalSesiones}
            </p>
          )}
        </div>

        {ejercicio.archivado ? (
          <BotonRestaurar id={id} destino={`/gym/ejercicios/${id}`} guia="detalle-restaurar" />
        ) : (
          <MenuMasOpciones guia="detalle-mas-opciones">
            <EditarEnfoque
              id={id}
              tipo={ejercicio.tipo}
              enfoqueActual={ejercicio.enfoque}
              metodoActual={ejercicio.metodo}
              rangoActual={ejercicio.rango}
              avanzado={avanzado}
            />
            {ejercicio.tipo === 'calistenia' ? <EditarNivel id={id} nivelActual={ejercicio.nivel} /> : null}
            <BotonArchivar id={id} nombre={ejercicio.nombre} />
          </MenuMasOpciones>
        )}
      </div>

      {ejercicio.archivado ? null : (
        <TarjetaSiguientePaso
          paso={paso}
          guiaBoton={estado.estado === 'sin_prueba' ? undefined : 'detalle-registrar-sesion'}
        >
          {estado.estado === 'sin_prueba' ? null : (
            <p className="text-sm text-texto">
              ¿Hiciste varios ejercicios?{' '}
              <Link href="/gym/entrenamiento" className="font-medium text-primario underline underline-offset-4">
                Anótalos juntos en Entrenar hoy
              </Link>
              .
            </p>
          )}
        </TarjetaSiguientePaso>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-5">
          <TarjetaRecomendacion
            recomendacion={recomendacion}
            sinPrueba={!tienePruebaInicial}
            plan={plan}
            ejercicio={ejercicio}
            avanzado={avanzado}
            conFrase={ejercicio.archivado}
          />
          {ejercicio.tipo === 'peso' ? <Progreso1RM sesiones={sesiones} avanzado={avanzado} /> : null}
        </div>

        <div className="space-y-8 lg:col-span-7">
          <section aria-labelledby="titulo-historico" data-guia="detalle-historico">
            <h2 id="titulo-historico" className="mb-3 text-lg font-semibold text-texto">
              {avanzado ? 'Histórico' : 'Lo que has hecho'}
            </h2>
            <HistorialSesiones sesiones={sesiones} avanzado={avanzado} />
          </section>
          <TendenciaProgreso sesiones={sesiones} />
        </div>
      </div>

      <div className="mt-10">
        <BotonEliminar
          id={id}
          nombre={ejercicio.nombre}
          archivado={ejercicio.archivado}
          sesiones={sesiones.length}
          series={totalSeries}
        />
      </div>
    </>
  );
}
