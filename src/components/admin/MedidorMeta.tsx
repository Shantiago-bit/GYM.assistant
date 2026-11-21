import type { ProyeccionMeta } from '@/lib/reglas/admin';
import { MedidorSemicircular } from './graficos/MedidorSemicircular';

export function MedidorMeta({ meta, activasHoy }: { meta: ProyeccionMeta; activasHoy: number }) {
  const cifras = [
    { titulo: 'Activas hoy', valor: activasHoy.toLocaleString('es-CO') },
    { titulo: 'Proyección a fin de mes', valor: meta.proyeccion.toLocaleString('es-CO') },
    { titulo: 'Faltan por día', valor: meta.faltan === 0 ? 'Meta cumplida' : meta.faltanPorDia.toLocaleString('es-CO') },
  ];
  return (
    <section aria-labelledby="titulo-meta" className="vidrio p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="titulo-meta" className="text-lg font-bold text-texto">
          Meta del mes
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            meta.enCamino
              ? 'bg-[color:var(--admin-sube-fondo)] text-[color:var(--admin-sube-texto)]'
              : 'bg-[color:var(--admin-baja-fondo)] text-[color:var(--admin-baja-texto)]'
          }`}
        >
          {meta.enCamino ? 'En camino' : 'Por debajo'}
        </span>
      </div>
      <p className="mt-1 text-sm text-texto-suave">
        Personas activas este mes frente a la meta de {meta.meta.toLocaleString('es-CO')}.
      </p>
      <div className="mt-4">
        <MedidorSemicircular
          titulo="Personas activas este mes frente a la meta"
          valor={meta.activas}
          total={meta.meta}
          etiquetaValor="Personas activas este mes"
          etiquetaTotal="Meta del mes"
        />
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {cifras.map((cifra) => (
          <div key={cifra.titulo} className="rounded-2xl bg-[color:var(--color-fondo)] p-2">
            <dt className="text-sm text-texto-suave">{cifra.titulo}</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums text-texto">{cifra.valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
