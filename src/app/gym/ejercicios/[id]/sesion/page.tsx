import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FormularioSeries } from '@/components/gym/FormularioSeries';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { formatearPeso, gramosAKg } from '@/lib/formato';
import { hoyBogota } from '@/lib/reglas/fechas';
import { cargarEjercicio } from '../cargar';

export default async function RegistrarSesionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ejercicio, tienePruebaInicial, sesiones, recomendacion } = await cargarEjercicio(id);
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
      <p className="mb-5 text-sm text-texto-suave">{ejercicio.nombre}</p>

      <Tarjeta className="mb-4 bg-primario-suave">
        <p className="text-sm font-semibold text-texto">Tu objetivo de hoy</p>
        <p className="mt-1 text-sm tabular-nums text-texto">
          Rango {min}–{max} reps · Meta {recomendacion.metaRepsSugerida} reps
          {pesoSugerido === null ? '' : ` · ${formatearPeso(pesoSugerido)}`}
        </p>
      </Tarjeta>

      <Tarjeta>
        <FormularioSeries
          tipo={ejercicio.tipo}
          urlEnvio={`/api/gym/ejercicios/${id}/sesiones`}
          destino={detalle}
          textoBoton="Guardar sesión"
          pesoInicialKg={pesoSugerido === null ? null : gramosAKg(pesoSugerido)}
          cantidadSeries={sesiones[0]?.series.length ?? 3}
          fechaMaxima={hoyBogota()}
        />
      </Tarjeta>
    </>
  );
}
