import Link from 'next/link';
import {
  FormularioEntrenamiento,
  type EjercicioDisponible,
} from '@/components/gym/FormularioEntrenamiento';
import { clasesBoton } from '@/components/ui/Boton';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { listarEjercicios, obtenerRecomendacion } from '@/lib/dataService';
import { formatearPeso, gramosAKg } from '@/lib/formato';
import { hoyBogota } from '@/lib/reglas/fechas';

export default async function EntrenamientoPage() {
  const activos = await listarEjercicios();
  // Una sesión exige prueba inicial, y la prueba cuenta como sesión.
  const conPrueba = activos.filter((ejercicio) => ejercicio.totalSesiones > 0);

  const ejercicios: EjercicioDisponible[] = await Promise.all(
    conPrueba.map(async (ejercicio) => {
      const { metaRepsSugerida, pesoSugeridoGramos } = await obtenerRecomendacion(ejercicio.id);
      const peso = pesoSugeridoGramos === null ? '' : ` · ${formatearPeso(pesoSugeridoGramos)}`;

      return {
        id: ejercicio.id,
        nombre: ejercicio.nombre,
        tipo: ejercicio.tipo,
        objetivo: `Meta ${metaRepsSugerida} reps${peso}`,
        pesoSugeridoKg: pesoSugeridoGramos === null ? null : gramosAKg(pesoSugeridoGramos),
      };
    }),
  );

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-texto">Entrenamiento de hoy</h1>
      <p className="mb-5 text-sm text-texto-suave">
        Marca los ejercicios que hiciste y registra sus series en una sola visita.
      </p>

      {ejercicios.length === 0 ? (
        <EstadoVacio
          titulo="No hay ejercicios listos"
          descripcion="Crea un ejercicio y registra su prueba inicial para poder entrenarlo aquí."
        >
          <Link href="/gym/ejercicios/nuevo" className={clasesBoton()}>
            Nuevo ejercicio
          </Link>
        </EstadoVacio>
      ) : (
        <FormularioEntrenamiento ejercicios={ejercicios} hoy={hoyBogota()} />
      )}
    </>
  );
}
