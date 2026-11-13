import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FormularioDias } from '@/components/gym/FormularioDias';
import { FormularioPerfil } from '@/components/gym/FormularioPerfil';
import { InterruptorModo } from '@/components/gym/InterruptorModo';
import { TarjetaAvisoDias } from '@/components/gym/TarjetaAvisoDias';
import { TarjetaRacha } from '@/components/gym/TarjetaRacha';
import { FotoPerfil } from '@/components/gym/FotoPerfil';
import { clasesBoton } from '@/components/ui/Boton';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { exigirSesionDePagina } from '@/lib/auth/sesion';
import { correoDeContacto } from '@/lib/correo';
import { obtenerHistorialCompleto, obtenerHistorialDias, obtenerPerfil, urlFirmadaAvatar } from '@/lib/dataService';
import { formatearFecha, formatearPeso } from '@/lib/formato';
import { hoyBogota } from '@/lib/reglas/fechas';
import { diasEnFecha } from '@/lib/reglas/racha';
import {
  calcularEdad,
  calcularRacha,
  ejercicioFavorito,
  fechasConSesion,
  nombreParaMostrar,
  recordsPersonales,
  totalesEntrenamiento,
  type MarcaPersonal,
  type RecordEjercicio,
} from '@/lib/reglas/perfil';

export const metadata = { title: 'Tu perfil · Gym Assistant' };

const FORMATO_MES = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const FORMATO_NUMERO = new Intl.NumberFormat('es-CO');

// created_at llega como texto de Postgres ("2026-10-01 12:34:56+00"): basta con el año y el mes.
const mesYAnio = (marcaDeTiempo: string) => FORMATO_MES.format(new Date(`${marcaDeTiempo.slice(0, 7)}-15T00:00:00Z`));

function Cifra({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <Tarjeta>
      <p className="text-2xl font-bold tabular-nums text-texto">{valor}</p>
      <p className="text-sm text-texto-suave">{etiqueta}</p>
    </Tarjeta>
  );
}

function Fecha({ marca }: { marca: MarcaPersonal }) {
  return (
    <span className="text-sm text-texto-suave">
      {formatearFecha(marca.fecha)}
      {marca.nuevo ? (
        <span className="ml-2 rounded-full bg-primario-suave px-2 py-0.5 font-semibold text-primario">Nuevo</span>
      ) : null}
    </span>
  );
}

function Record({ record, avanzado }: { record: RecordEjercicio; avanzado: boolean }) {
  return (
    <li className="rounded-gym border border-borde bg-superficie p-3">
      <p className="font-semibold text-texto">{record.nombre}</p>
      {record.tipo === 'peso' ? (
        <dl className="mt-1 space-y-1 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-texto-suave">Mayor peso</dt>
            <dd className="text-texto">
              {formatearPeso(record.mayorPeso.valor)} × {record.mayorPeso.reps} <Fecha marca={record.mayorPeso} />
            </dd>
          </div>
          {record.mejor1RM ? (
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-texto-suave">{avanzado ? 'Mejor 1RM estimado' : 'Mejor peso máximo estimado'}</dt>
              <dd className="text-texto">
                {formatearPeso(Math.round(record.mejor1RM.valor / 100) * 100)} <Fecha marca={record.mejor1RM} />
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <dl className="mt-1 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-texto-suave">Máximo de repeticiones{record.variante ? ` (${record.variante})` : ''}</dt>
            <dd className="text-texto">
              {record.maxReps.valor} <Fecha marca={record.maxReps} />
            </dd>
          </div>
        </dl>
      )}
    </li>
  );
}

const tieneNuevo = (record: RecordEjercicio) =>
  record.tipo === 'peso' ? record.mayorPeso.nuevo || record.mejor1RM?.nuevo === true : record.maxReps.nuevo;

export default async function PerfilPage() {
  const sesion = await exigirSesionDePagina();
  const perfil = await obtenerPerfil(sesion.id);
  if (!perfil) {
    redirect('/gym/perfil/completar');
  }

  const hoy = hoyBogota();
  const [historial, avatarUrl, historialDias] = await Promise.all([
    obtenerHistorialCompleto(sesion.id),
    urlFirmadaAvatar(perfil.avatarRuta),
    obtenerHistorialDias(sesion.id),
  ]);
  const nombre = nombreParaMostrar(perfil.nombre, perfil.apodo);
  const totales = totalesEntrenamiento(historial);
  const fechas = fechasConSesion(historial);
  // Cada fecha se evalúa con los días de entrenamiento que tenía la persona ese día.
  const racha = calcularRacha(fechas, hoy, historialDias);
  const diasVigentes = diasEnFecha(historialDias, hoy);
  const favorito = ejercicioFavorito(historial);
  // Los récords recientes primero; después, por nombre.
  const records = recordsPersonales(historial, hoy).sort(
    (a, b) => Number(tieneNuevo(b)) - Number(tieneNuevo(a)) || a.nombre.localeCompare(b.nombre, 'es'),
  );
  const contacto = correoDeContacto();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {perfil.avisoDiasVisto ? null : <TarjetaAvisoDias enPerfil />}
      <Tarjeta className="flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-start">
        <FotoPerfil nombre={perfil.nombre} avatarUrl={avatarUrl} />
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold text-texto">{nombre}</h1>
          <p className="text-texto-suave">{perfil.nombre}</p>
          <p className="mt-2 text-sm text-texto">
            {calcularEdad(perfil.fechaNacimiento, hoy)} años · Miembro desde {mesYAnio(perfil.miembroDesde)}
          </p>
        </div>
      </Tarjeta>

      <section aria-labelledby="titulo-estadisticas" className="space-y-4">
        <h2 id="titulo-estadisticas" className="text-xl font-bold text-texto">
          Tu entrenamiento
        </h2>
        <TarjetaRacha racha={racha} diasElegidos={diasVigentes} entrenoHoy={fechas.includes(hoy)} />
        {totales.sesiones === 0 ? (
          <EstadoVacio
            titulo="Aún no hay estadísticas"
            descripcion="Cuando registres tus primeras sesiones, aquí verás tus récords, tu racha y tu ejercicio favorito."
          >
            <Link href="/gym/entrenamiento" className={clasesBoton()}>
              Empezar a entrenar
            </Link>
          </EstadoVacio>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Cifra valor={FORMATO_NUMERO.format(totales.sesiones)} etiqueta="Sesiones" />
              <Cifra valor={`${FORMATO_NUMERO.format(totales.volumenKg)} kg`} etiqueta="Volumen total" />
            </div>
            <p className="text-xs text-texto-suave">
              La racha cuenta tus días de entrenamiento seguidos con al menos una sesión; los días de descanso no la
              rompen, y entrenar en uno suma. Volumen: peso × repeticiones de {FORMATO_NUMERO.format(totales.series)}{' '}
              series efectivas.
            </p>
            {favorito ? (
              <Tarjeta>
                <p className="text-sm text-texto-suave">Ejercicio favorito</p>
                <p className="text-lg font-semibold text-texto">
                  {favorito.nombre}{' '}
                  <span className="text-sm font-normal text-texto-suave">
                    ({favorito.sesiones} {favorito.sesiones === 1 ? 'sesión' : 'sesiones'})
                  </span>
                </p>
              </Tarjeta>
            ) : null}
            {records.length > 0 ? (
              <div>
                <h3 className="mb-2 font-semibold text-texto">Récords personales</h3>
                <ul className="grid gap-3 md:grid-cols-2">
                  {records.map((record) => (
                    <Record key={record.ejercicioId} record={record} avanzado={perfil.modoAvanzado} />
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section id="dias" aria-labelledby="titulo-dias" className="scroll-mt-20 space-y-4">
        <h2 id="titulo-dias" className="text-xl font-bold text-texto">
          Mis días de entrenamiento
        </h2>
        <Tarjeta data-guia="dias-entrenamiento">
          <FormularioDias inicial={diasVigentes} />
        </Tarjeta>
      </section>

      <section id="modo" aria-labelledby="titulo-modo" className="scroll-mt-20 space-y-4">
        <h2 id="titulo-modo" className="text-xl font-bold text-texto">
          Cómo ves la app
        </h2>
        <Tarjeta>
          <InterruptorModo inicial={perfil.modoAvanzado} />
        </Tarjeta>
      </section>

      <section aria-labelledby="titulo-datos" className="space-y-4">
        <h2 id="titulo-datos" className="text-xl font-bold text-texto">
          Tus datos
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Tarjeta>
            <FormularioPerfil inicial={{ nombre: perfil.nombre, apodo: perfil.apodo, genero: perfil.genero }} />
          </Tarjeta>
          <Tarjeta className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-texto">Fecha de nacimiento</p>
              <p className="text-texto">{formatearFecha(perfil.fechaNacimiento)}</p>
              <p className="mt-1 text-texto-suave">
                No se puede cambiar desde la app.
                {contacto ? (
                  <>
                    {' '}Si hay un error, escríbenos a{' '}
                    <a href={`mailto:${contacto}`} className="font-medium text-primario underline underline-offset-4">
                      {contacto}
                    </a>
                    .
                  </>
                ) : null}
              </p>
            </div>
            <div>
              <p className="font-medium text-texto">Correo</p>
              <p className="break-all text-texto">{sesion.email}</p>
              <p className="mt-1 text-texto-suave">No se puede cambiar desde la app.</p>
            </div>
            <div className="flex flex-wrap gap-3 border-t border-borde pt-4">
              <Link href="/account/password" className={clasesBoton('secundario')}>
                Cambiar contraseña
              </Link>
              <Link href="/privacidad" className={clasesBoton('fantasma')}>
                Política de privacidad
              </Link>
            </div>
          </Tarjeta>
        </div>
      </section>
    </div>
  );
}
