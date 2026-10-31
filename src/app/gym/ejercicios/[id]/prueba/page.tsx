import Link from 'next/link';
import { FormularioSeries } from '@/components/gym/FormularioSeries';
import { Aviso } from '@/components/ui/Aviso';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { gramosAKg } from '@/lib/formato';
import { MENSAJES } from '@/lib/reglas/errores';
import { cargarEjercicio } from '../cargar';

export default async function PruebaInicialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ejercicio, tienePruebaInicial } = await cargarEjercicio(id);
  const detalle = `/gym/ejercicios/${id}` as const;

  return (
    <>
      <Link href={detalle} className="text-sm font-medium text-primario underline-offset-4 hover:underline">
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
        <Tarjeta>
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
      )}
    </>
  );
}
