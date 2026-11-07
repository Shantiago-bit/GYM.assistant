import Link from 'next/link';
import { FormularioSeries } from '@/components/gym/FormularioSeries';
import { Aviso } from '@/components/ui/Aviso';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { gramosAKg } from '@/lib/formato';
import { MENSAJES } from '@/lib/reglas/errores';
import { cargarEjercicio } from '../cargar';

export default async function PruebaInicialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ejercicio, tienePruebaInicial } = await cargarEjercicio(id);
  const detalle = `/gym/ejercicios/${id}` as const;

  return (
    <>
      <Link
        href={detalle}
        className="text-sm font-medium text-primario underline-offset-4 hover:underline"
      >
        Volver a {ejercicio.nombre}
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-bold text-texto">Prueba inicial</h1>
      <p className="mb-5 text-sm text-texto-suave">
        Registra tu primera medición de {ejercicio.nombre}. Fija tu punto de partida.
      </p>

      {tienePruebaInicial ? (
        <Aviso tipo="advertencia">
          {MENSAJES.PRUEBA_YA_REGISTRADA}{' '}
          <Link href={detalle} className="font-semibold underline">
            Ver el ejercicio
          </Link>
        </Aviso>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <Tarjeta className="bg-primario-suave lg:sticky lg:top-6">
              <p className="text-sm font-semibold text-texto">Cómo hacer la prueba</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-texto-suave">
                <li>
                  Calienta con una o dos series ligeras y márcalas como &quot;Aproximación&quot;.
                </li>
                <li>
                  Haz tus series de trabajo con buena técnica dentro del rango{' '}
                  <span className="tabular-nums">
                    {ejercicio.rango[0]}–{ejercicio.rango[1]}
                  </span>{' '}
                  reps.
                </li>
                <li>El peso más alto de tus series de trabajo será tu peso de referencia.</li>
                <li>Si puedes, anota el RIR: mejora el 1RM estimado y las recomendaciones.</li>
              </ul>
            </Tarjeta>
          </aside>
          <Tarjeta className="lg:col-span-8">
            <FormularioSeries
              tipo={ejercicio.tipo}
              urlEnvio={`/api/gym/ejercicios/${id}/prueba`}
              destino={detalle}
              textoBoton="Guardar prueba inicial"
              pesoInicialKg={
                ejercicio.pesoRefGramos === null ? null : gramosAKg(ejercicio.pesoRefGramos)
              }
            />
          </Tarjeta>
        </div>
      )}
    </>
  );
}
