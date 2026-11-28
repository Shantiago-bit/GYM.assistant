import type { Metadata } from 'next';
import { GraficoArea } from '@/components/admin/graficos/GraficoArea';
import { GraficoBarras } from '@/components/admin/graficos/GraficoBarras';
import { TablaDatos } from '@/components/admin/graficos/TablaDatos';
import { TarjetaCifra } from '@/components/admin/TarjetaCifra';
import { exigirAdminDePagina } from '@/lib/auth/admin';
import { limiteDiarioChat } from '@/lib/chat/limite';
import { estadisticasChrono } from '@/lib/dataService';
import { etiquetaMes } from '@/lib/reglas/admin';
import { DIAS_GRAFICO_CHRONO, MESES_GRAFICO_CHRONO, promedioPorPersona, textoPorcentaje } from '@/lib/reglas/chronoAdmin';
import { hoyBogota } from '@/lib/reglas/fechas';

export const metadata: Metadata = { title: 'CHRONO · Administración' };

// Los días llegan como días de Bogotá (AAAA-MM-DD): se formatean en UTC para no correrlos un día.
const DIA_CORTO = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const DIA_LARGO = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const deDia = (dia: string) => new Date(`${dia}T00:00:00Z`);
const numero = (valor: number) => valor.toLocaleString('es-CO', { maximumFractionDigits: 1 });

// Uso del asistente CHRONO en toda la plataforma. Sale solo de chat_uso, que guarda cuántos mensajes envió cada
// cuenta cada día: las conversaciones no se guardan en la base, así que no hay nada de ellas que mostrar.
export default async function ChronoAdminPage() {
  await exigirAdminDePagina();
  const hoy = hoyBogota();
  const limite = limiteDiarioChat();
  const { dias, meses, resumen } = await estadisticasChrono(hoy, limite);
  const mensajes30 = dias.reduce((suma, dia) => suma + dia.mensajes, 0);
  const diasConUso = dias.filter((dia) => dia.personas > 0);
  const promediosPorDia = dias.map((dia) => promedioPorPersona(dia.mensajes, dia.personas));
  const mesActual = meses.at(-1)!;

  return (
    <>
      <section aria-labelledby="titulo-chrono" className="space-y-2">
        <h1 id="titulo-chrono" className="text-titulo-1 font-bold">
          CHRONO
        </h1>
        <p className="text-base text-[color:var(--admin-texto-claro-suave)]">
          Cuánto se usa el asistente: mensajes por día y por mes, quién llega al límite diario y qué parte de las cuentas
          lo ha probado.
        </p>
        <p
          role="note"
          className="inline-flex rounded-full bg-[color:var(--admin-igual-fondo)] px-3 py-1 text-sm font-semibold text-[color:var(--admin-igual-texto)]"
        >
          No se guardan ni se muestran las conversaciones: solo cuántos mensajes envió cada cuenta cada día.
        </p>
      </section>

      <section aria-labelledby="titulo-cifras-chrono" className="space-y-3">
        <h2 id="titulo-cifras-chrono" className="text-titulo-2 font-bold">
          Últimos {DIAS_GRAFICO_CHRONO} días
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TarjetaCifra titulo="Mensajes" valor={numero(resumen.mensajes30)} detalle={`${numero(resumen.personas30)} personas lo usaron`} />
          <TarjetaCifra titulo="Mensajes por persona" valor={numero(resumen.promedio30)} detalle="Promedio de quienes lo usaron" />
          <TarjetaCifra
            titulo="Llegaron al límite diario"
            valor={numero(resumen.personasEnLimite30)}
            detalle={
              limite > 0
                ? `${textoPorcentaje(resumen.porcentajeEnLimite30, 'Nadie lo usó')} de quienes lo usaron · límite de ${numero(limite)} mensajes por día · ${numero(resumen.diasEnLimite30)} ${resumen.diasEnLimite30 === 1 ? 'vez' : 'veces'}`
                : 'El límite diario está en 0: CHRONO está apagado'
            }
          />
          <TarjetaCifra
            titulo="Adopción"
            valor={textoPorcentaje(resumen.adopcion, 'Sin cuentas')}
            detalle={`${numero(resumen.usaronAlgunaVez)} de ${numero(resumen.registradas)} cuentas lo usaron alguna vez`}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="titulo-mensajes-dia" className="vidrio p-5 sm:p-6">
          <h2 id="titulo-mensajes-dia" className="text-titulo-2 font-bold text-texto">
            Mensajes por día
          </h2>
          <p className="mb-3 mt-1 text-sm text-texto-suave">Todos los mensajes de todas las cuentas, cada día (hora de Bogotá).</p>
          <GraficoArea
            titulo={`Mensajes de CHRONO por día, últimos ${DIAS_GRAFICO_CHRONO} días`}
            descripcion={`${numero(mensajes30)} mensajes en ${numero(diasConUso.length)} días con uso.`}
            nombreValor="Mensajes"
            puntos={dias.map((dia) => ({ etiqueta: DIA_CORTO.format(deDia(dia.dia)), etiquetaLarga: DIA_LARGO.format(deDia(dia.dia)), valor: dia.mensajes }))}
          />
        </section>

        <section aria-labelledby="titulo-limite" className="vidrio p-5 sm:p-6">
          <h2 id="titulo-limite" className="text-titulo-2 font-bold text-texto">
            Mensajes por persona frente al límite
          </h2>
          <p className="mb-3 mt-1 text-sm text-texto-suave">
            Promedio de mensajes de quienes usaron CHRONO cada día, con el límite diario por cuenta como referencia.
          </p>
          <GraficoArea
            titulo="Mensajes por persona y día frente al límite diario"
            descripcion={
              limite > 0
                ? `El límite es de ${numero(limite)} mensajes por cuenta y día. ${numero(resumen.personasEnLimite30)} ${resumen.personasEnLimite30 === 1 ? 'persona llegó' : 'personas llegaron'} a él en ${DIAS_GRAFICO_CHRONO} días.`
                : 'El límite diario está en 0.'
            }
            nombreValor="Mensajes por persona"
            mostrarPromedio={false}
            {...(limite > 0 ? { referencia: { valor: limite, etiqueta: 'Límite diario' } } : {})}
            puntos={dias.map((dia, i) => ({
              etiqueta: DIA_CORTO.format(deDia(dia.dia)),
              etiquetaLarga: DIA_LARGO.format(deDia(dia.dia)),
              valor: promediosPorDia[i]!,
            }))}
          />
          <TablaDatos
            titulo="Uso de CHRONO por día"
            columnas={['Día', 'Mensajes', 'Personas', 'Mensajes por persona', 'Llegaron al límite']}
            filas={dias.map((dia, i) => ({
              etiqueta: DIA_LARGO.format(deDia(dia.dia)),
              valores: [dia.mensajes, dia.personas, promediosPorDia[i]!, dia.enLimite],
            }))}
          />
        </section>
      </div>

      <section aria-labelledby="titulo-meses" className="vidrio p-5 sm:p-6">
        <h2 id="titulo-meses" className="text-titulo-2 font-bold text-texto">
          Mensajes por mes
        </h2>
        <p className="mb-3 mt-1 text-sm text-texto-suave">
          Últimos {MESES_GRAFICO_CHRONO} meses. Este mes, {textoPorcentaje(mesActual.porcentajeActivas, 'sin personas activas')}
          {mesActual.porcentajeActivas === null ? '' : ' de las personas que entrenaron usaron CHRONO'}.
        </p>
        <GraficoBarras
          titulo={`Mensajes de CHRONO por mes, últimos ${MESES_GRAFICO_CHRONO} meses`}
          descripcion={`Este mes: ${numero(mesActual.mensajes)} mensajes de ${numero(mesActual.personas)} personas.`}
          nombreValor="Mensajes"
          puntos={meses.map((mes) => ({ etiqueta: etiquetaMes(mes.mes), etiquetaLarga: etiquetaMes(mes.mes, true), valor: mes.mensajes }))}
        />
        <TablaDatos
          titulo="Uso de CHRONO por mes"
          columnas={['Mes', 'Mensajes', 'Personas que lo usaron', 'Personas activas', '% de las activas que lo usaron', 'Mensajes por persona']}
          filas={meses.map((mes) => ({
            etiqueta: etiquetaMes(mes.mes, true),
            valores: [mes.mensajes, mes.personas, mes.activas, textoPorcentaje(mes.porcentajeActivas, '—'), mes.promedio],
          }))}
        />
      </section>

      <p className="text-sm text-[color:var(--admin-texto-claro-suave)]">
        Persona activa: registró al menos una sesión en el mes. Fechas en hora de Bogotá. Las cifras se actualizan cada 5 minutos.
      </p>
    </>
  );
}
