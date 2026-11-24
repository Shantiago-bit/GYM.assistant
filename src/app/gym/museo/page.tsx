import type { ReactNode } from 'react';
import { IndicadorProgreso, textoSerie } from '@/components/gym/IndicadorProgreso';
import { InsigniaTipo } from '@/components/gym/InsigniaTipo';
import { IndiceSalas } from '@/components/museo/IndiceSalas';
import { PiezaRecord } from '@/components/museo/PiezaRecord';
import { Boton } from '@/components/ui/Boton';
import { Campo } from '@/components/ui/Campo';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { Icono, type NombreIcono } from '@/components/ui/Icono';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { exigirSesionDePagina } from '@/lib/auth/sesion';
import { obtenerHistorialCompleto, obtenerHistorialDias, obtenerPerfil, obtenerResumen } from '@/lib/dataService';
import { GaleriaCuadros } from '@/components/museo/GaleriaCuadros';
import { cuadrosDeMeses } from '@/lib/reglas/cuadroMes';
import { hoyBogota, restarDias } from '@/lib/reglas/fechas';
import { SALAS_MUSEO } from '@/lib/reglas/museo';
import { recordsPersonales, type RecordEjercicio } from '@/lib/reglas/perfil';
import { esquemaResumen } from '@/lib/validacion/esquemas';
import { BarraLectura } from '@/components/movimiento/BarraLectura';

export const metadata = { title: 'Museo' };

const DIAS_POR_DEFECTO = 7;

const tieneNuevo = (record: RecordEjercicio) =>
  record.tipo === 'peso' ? record.mayorPeso.nuevo || record.mejor1RM?.nuevo === true : record.maxReps.nuevo;

function Sala({ indice, descripcion, children }: { indice: number; descripcion: string; children: ReactNode }) {
  const sala = SALAS_MUSEO[indice]!;
  return (
    <section id={sala.id} aria-labelledby={`${sala.id}-titulo`} className="scroll-mt-32 lg:scroll-mt-28">
      <div className="velo-cielo mb-4 flex items-center gap-3 rounded-boton">
        <span aria-hidden="true" className="baldosa-marca flex h-10 w-10 shrink-0 items-center justify-center rounded-boton text-primario">
          <Icono nombre={sala.icono as NombreIcono} className="h-5 w-5" />
        </span>
        <div>
          <h2 id={`${sala.id}-titulo`} className="font-titulos text-titulo-2 font-bold text-texto">
            {sala.titulo}
          </h2>
          <p className="text-sm text-texto-suave">{descripcion}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Cifra({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <Tarjeta>
      <p className="text-2xl font-bold tabular-nums text-texto">{valor}</p>
      <p className="text-sm text-texto-suave">{etiqueta}</p>
    </Tarjeta>
  );
}

export default async function MuseoPage({
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
  const [resumen, historial, perfil, historialDias] = await Promise.all([
    obtenerResumen(usuarioId, desde, hasta),
    obtenerHistorialCompleto(usuarioId),
    obtenerPerfil(usuarioId),
    obtenerHistorialDias(usuarioId),
  ]);
  // Los récords recientes primero; después, por nombre (igual que en el perfil).
  const records = recordsPersonales(historial, hoy).sort(
    (a, b) => Number(tieneNuevo(b)) - Number(tieneNuevo(a)) || a.nombre.localeCompare(b.nombre, 'es'),
  );
  // Cada mes, un cuadro: "El cielo de <mes>" (src/lib/reglas/cuadroMes.ts).
  const cuadros = cuadrosDeMeses({ historial, historialDias, hoy });
  const avanzado = perfil?.modoAvanzado ?? false;

  return (
    <div className="pb-8">
      <BarraLectura />
      <header className="velo-cielo mb-6 rounded-boton">
        <h1 className="font-titulos text-titulo-1 font-bold text-texto">Museo</h1>
        <p className="text-base text-texto-suave">Aquí se exhiben tus récords y todo lo que has logrado</p>
      </header>

      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
        <IndiceSalas />
        <div className="space-y-12">
          <Sala indice={0} descripcion="Tu mejor marca en cada ejercicio, con la fecha en que la lograste.">
            {records.length > 0 ? (
              <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {records.map((record) => (
                  <PiezaRecord key={record.ejercicioId} record={record} avanzado={avanzado} />
                ))}
              </ul>
            ) : (
              <EstadoVacio
                titulo="La sala aún está vacía"
                descripcion="Registra tus sesiones y aquí se exhibirá tu mejor marca de cada ejercicio."
              />
            )}
          </Sala>

          <Sala indice={1} descripcion="Tu mes en el gym, el actual y los anteriores.">
            <GaleriaCuadros cuadros={cuadros} hoy={hoy} />
          </Sala>

          <Sala indice={2} descripcion="Elige un periodo y mira cuántas veces entrenaste y cómo mejoró cada ejercicio.">
            <div className="mb-6 grid gap-4 lg:grid-cols-12">
              <Tarjeta className="lg:col-span-6">
                <form action="/gym/museo#sala-archivo" className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
              <EstadoVacio titulo="Sin sesiones en este periodo" descripcion="Prueba con un rango de fechas más amplio." />
            ) : (
              <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {resumen.ejercicios.map((ejercicio) => (
                  <li key={ejercicio.id}>
                    <Tarjeta className="h-full">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold text-texto">{ejercicio.nombre}</h3>
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
          </Sala>
        </div>
      </div>
    </div>
  );
}
