import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FormularioSeries } from '@/components/gym/FormularioSeries';
import { NotaMetodo, PlanSesion } from '@/components/gym/PlanSesion';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { gramosAKg } from '@/lib/formato';
import { textoMetodo } from '@/lib/reglas/metodos';
import { hoyBogota } from '@/lib/reglas/fechas';
import { cargarEjercicio } from '../cargar';

export default async function RegistrarSesionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ejercicio, tienePruebaInicial, recomendacion, plan } = await cargarEjercicio(id);
  const detalle = `/gym/ejercicios/${id}` as const;

  if (!tienePruebaInicial) {
    redirect(`/gym/ejercicios/${id}/prueba`);
  }

  const [min, max] = ejercicio.rango;
  const pesoSugerido = recomendacion.pesoSugeridoGramos;

  return (
    <>
      <Link href={detalle} className="text-sm font-medium text-primario underline-offset-4 hover:underline">
        Volver a {ejercicio.nombre}
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-bold text-texto">Registrar sesión</h1>
      <p className="mb-5 text-sm text-texto-suave">
        {ejercicio.nombre} · {textoMetodo(ejercicio.metodo)}
      </p>

      <Tarjeta className="mb-4 bg-primario-suave">
        <p className="text-sm font-semibold text-texto">Tu objetivo de hoy</p>
        <p className="mb-3 mt-1 text-sm tabular-nums text-texto-suave">
          Rango {min}–{max} reps · Meta {recomendacion.metaRepsSugerida} reps
        </p>
        <PlanSesion plan={plan} />
        <NotaMetodo plan={plan} />
      </Tarjeta>

      <Tarjeta>
        <FormularioSeries
          tipo={ejercicio.tipo}
          urlEnvio={`/api/gym/ejercicios/${id}/sesiones`}
          destino={detalle}
          textoBoton="Guardar sesión"
          pesoInicialKg={pesoSugerido === null ? null : gramosAKg(pesoSugerido)}
          pesosPlanKg={plan.map((serie) => (serie.pesoGramos === null ? null : gramosAKg(serie.pesoGramos)))}
          etiquetas={plan.map((serie) => serie.etiqueta)}
          fechaMaxima={hoyBogota()}
        />
      </Tarjeta>
    </>
  );
}
