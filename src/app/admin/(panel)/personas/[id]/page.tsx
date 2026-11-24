import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccionesPersona } from '@/components/admin/AccionesPersona';
import { GraficoSemanas } from '@/components/admin/GraficoSemanas';
import { exigirAdminDePagina, puedeActuar } from '@/lib/auth/admin';
import { obtenerDetallePersona, registrarAuditoria } from '@/lib/dataService';
import { ETIQUETAS_NIVEL, esNivelAnimacion } from '@/lib/reglas/animacion';
import { hoyBogota } from '@/lib/reglas/fechas';
import {
  edadDesde,
  esIdValido,
  fechaHoraBogota,
  motivoRechazo,
  resumirDetalle,
  sesionesPorSemana,
  TEXTO_ACCION,
  TEXTO_ESTADO,
} from '@/lib/reglas/personasAdmin';
import { NOMBRES_DIA } from '@/lib/reglas/racha';

export const metadata: Metadata = { title: 'Detalle de persona · Administración' };

const TEXTO_GENERO: Record<string, string> = {
  hombre: 'Hombre',
  mujer: 'Mujer',
  otro: 'Otro',
  prefiero_no_decir: 'Prefiere no decirlo',
};
const TEXTO_DECISION: Record<string, string> = { aprobada: 'Aprobada', rechazada: 'Rechazada' };

function Dato({ termino, children }: { termino: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-borde py-2 last:border-0 sm:flex-row sm:gap-4">
      <dt className="text-sm font-medium text-texto-suave sm:w-48 sm:shrink-0">{termino}</dt>
      <dd className="text-base text-texto">{children}</dd>
    </div>
  );
}

export default async function DetallePersonaPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await exigirAdminDePagina();
  const { id } = await params;
  if (!esIdValido(id)) notFound();
  const hoy = hoyBogota();
  const persona = await obtenerDetallePersona(id, hoy);
  if (!persona) notFound();
  // Ver el detalle (con el correo completo) queda en la auditoría.
  await registrarAuditoria({ adminId: admin.id, accion: 'ver_usuario', objetivoUsuarioId: id, detalle: { origen: 'panel' } });

  const edad = persona.fechaNacimiento ? edadDesde(persona.fechaNacimiento, hoy) : null;
  const esMenor = (edad !== null && edad < 18) || persona.estado === 'menor_pendiente' || persona.estado === 'menor_autorizado';
  const semanas = sesionesPorSemana(persona.fechasSesiones, hoy);
  const ultimaSesion = persona.fechasSesiones.at(-1) ?? null;
  const motivo = motivoRechazo({ adminId: admin.id, objetivoId: id, objetivoEsAdmin: persona.esAdmin });
  const nombreVisible = persona.apodo ?? persona.nombre ?? 'Sin apodo';

  return (
    <>
      <nav aria-label="Ruta">
        <Link
          href={'/admin/personas' as Route}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-[color:var(--admin-texto-claro)] underline-offset-4 hover:underline"
        >
          ← Volver a Personas
        </Link>
      </nav>

      <section aria-labelledby="titulo-persona" className="space-y-1">
        <h1 id="titulo-persona" className="text-titulo-1 font-bold">
          {nombreVisible}
        </h1>
        <p className="text-base text-[color:var(--admin-texto-claro-suave)]">
          {TEXTO_ESTADO[persona.estado]}
          {persona.esAdmin ? ' · Cuenta de administración' : ''}
        </p>
      </section>

      {esMenor ? (
        <p role="note" className="vidrio border-l-4 border-peligro p-4 text-base font-semibold text-texto">
          Cuenta de menor de edad: accede solo si es necesario para soporte.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="titulo-cuenta" className="vidrio p-4">
          <h2 id="titulo-cuenta" className="mb-2 text-lg font-bold text-texto">
            Cuenta
          </h2>
          <dl>
            <Dato termino="Correo">
              <span className="break-all">{persona.correo || '—'}</span>
            </Dato>
            <Dato termino="Apodo">{persona.apodo ?? '—'}</Dato>
            <Dato termino="Nombre">{persona.nombre ?? '—'}</Dato>
            <Dato termino="Edad">{edad === null ? '—' : `${edad} años`}</Dato>
            <Dato termino="Género">{persona.genero ? (TEXTO_GENERO[persona.genero] ?? persona.genero) : '—'}</Dato>
            <Dato termino="Registro">{fechaHoraBogota(persona.registro)}</Dato>
            <Dato termino="Confirmación">{persona.confirmada ? fechaHoraBogota(persona.confirmada) : 'Sin confirmar'}</Dato>
            {persona.solicitudTutor ? (
              <Dato termino="Autorización del tutor">
                {persona.solicitudTutor.decision ? (TEXTO_DECISION[persona.solicitudTutor.decision] ?? persona.solicitudTutor.decision) : 'Pendiente'}
                <span className="block text-sm text-texto-suave">
                  Pedida {fechaHoraBogota(persona.solicitudTutor.creada)} · vence {fechaHoraBogota(persona.solicitudTutor.vence)}
                  {persona.solicitudTutor.respondida ? ` · respondida ${fechaHoraBogota(persona.solicitudTutor.respondida)}` : ''}
                </span>
              </Dato>
            ) : null}
            <Dato termino="Días de entrenamiento">
              {persona.dias.length ? persona.dias.map((dia) => NOMBRES_DIA[dia]).join(', ') : 'Los de siempre (lunes a sábado)'}
            </Dato>
            <Dato termino="Modo">{persona.modoAvanzado ? 'Avanzado' : 'Sencillo'}</Dato>
            <Dato termino="Animaciones">
              {persona.nivelAnimacion && esNivelAnimacion(persona.nivelAnimacion) ? ETIQUETAS_NIVEL[persona.nivelAnimacion].nombre : 'Por defecto'}
            </Dato>
          </dl>
        </section>

        <section aria-labelledby="titulo-actividad" className="vidrio p-4">
          <h2 id="titulo-actividad" className="mb-2 text-lg font-bold text-texto">
            Actividad
          </h2>
          <GraficoSemanas semanas={semanas} />
          <dl className="mt-3">
            <Dato termino="Ejercicios">
              {persona.ejerciciosActivos} activos · {persona.ejerciciosArchivados} archivados
            </Dato>
            <Dato termino="Racha">
              {persona.racha.actual} actual · {persona.racha.mejor} la mejor
            </Dato>
            <Dato termino="Récords de peso">{persona.records}</Dato>
            <Dato termino="Última sesión">{ultimaSesion ?? '—'}</Dato>
            <Dato termino="Días con sesión">{persona.fechasSesiones.length}</Dato>
          </dl>
        </section>
      </div>

      <section aria-labelledby="titulo-acciones" className="vidrio p-4">
        <h2 id="titulo-acciones" className="mb-2 text-lg font-bold text-texto">
          Acciones de soporte
        </h2>
        {!puedeActuar(admin) ? (
          <p className="text-base text-texto-suave">Tu rol es de solo lectura: no puedes hacer acciones sobre las cuentas.</p>
        ) : motivo ? (
          <p className="text-base text-texto-suave">{motivo}</p>
        ) : (
          <AccionesPersona id={persona.id} estado={persona.estado} correo={persona.correo} />
        )}
      </section>

      <section aria-labelledby="titulo-correos" className="vidrio p-4">
        <h2 id="titulo-correos" className="mb-2 text-lg font-bold text-texto">
          Correos
        </h2>
        {persona.correos.length === 0 ? (
          <p className="text-base text-texto-suave">No hay correos registrados (el registro guarda los últimos 30 días).</p>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Correos enviados">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-borde">
                  <th scope="col" className="px-3 py-2 font-semibold text-texto">Tipo</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-texto">Resultado</th>
                  <th scope="col" className="px-3 py-2 font-semibold text-texto">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {persona.correos.map((correo, i) => (
                  <tr key={`${correo.fecha}-${i}`} className="border-b border-borde last:border-0">
                    <td className="px-3 py-2 text-texto">{correo.tipo.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2 text-texto">{correo.resultado.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2 tabular-nums text-texto">{fechaHoraBogota(correo.fecha)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="titulo-auditoria-persona" className="vidrio p-4">
        <h2 id="titulo-auditoria-persona" className="mb-2 text-lg font-bold text-texto">
          Auditoría de esta cuenta
        </h2>
        {persona.auditoria.length === 0 ? (
          <p className="text-base text-texto-suave">Sin acciones registradas.</p>
        ) : (
          <ol className="space-y-2">
            {persona.auditoria.map((fila, i) => (
              <li key={`${fila.fecha}-${i}`} className="border-b border-borde pb-2 last:border-0">
                <p className="text-base text-texto">
                  <span className="font-semibold">{fila.admin ?? 'Administración'}</span> · {TEXTO_ACCION[fila.accion] ?? fila.accion}
                </p>
                <p className="text-sm text-texto-suave">
                  {fechaHoraBogota(fila.fecha)}
                  {resumirDetalle(fila.detalle) ? ` · ${resumirDetalle(fila.detalle)}` : ''}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
