import Link from 'next/link';
import {
  FormularioEntrenamiento,
  type EjercicioDisponible,
} from '@/components/gym/FormularioEntrenamiento';
import { clasesBoton } from '@/components/ui/Boton';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { exigirSesionDePagina } from '@/lib/auth/sesion';
import { listarEjercicios, obtenerEjercicio, obtenerPerfil } from '@/lib/dataService';
import { formatearPeso, gramosAKg } from '@/lib/formato';
import { textoMetodo } from '@/lib/reglas/metodos';
import { hoyBogota } from '@/lib/reglas/fechas';

export default async function EntrenamientoPage() {
  const { id: usuarioId } = await exigirSesionDePagina();
  const [activos, perfil] = await Promise.all([listarEjercicios(usuarioId), obtenerPerfil(usuarioId)]);
  const avanzado = perfil?.modoAvanzado ?? false;
  // Una sesión exige prueba inicial, y la prueba cuenta como sesión.
  const conPrueba = activos.filter((ejercicio) => ejercicio.totalSesiones > 0);

  const ejercicios: EjercicioDisponible[] = await Promise.all(
    conPrueba.map(async (ejercicio) => {
      const { recomendacion, plan } = await obtenerEjercicio(usuarioId, ejercicio.id);
      const { metaRepsSugerida, pesoSugeridoGramos } = recomendacion;
      const peso = pesoSugeridoGramos === null ? '' : ` · ${formatearPeso(pesoSugeridoGramos)}`;
      const metodo = ejercicio.metodo === 'rectas' ? '' : ` · ${textoMetodo(ejercicio.metodo)}`;
      // Avanzado: "Meta 12 reps · 60 kg". Sencillo: "Usa 60 kg y busca 12 repeticiones".
      const objetivo = avanzado
        ? `Meta ${metaRepsSugerida} reps${peso}${metodo}`
        : pesoSugeridoGramos === null
          ? `Busca ${metaRepsSugerida} repeticiones por serie`
          : `Usa ${formatearPeso(pesoSugeridoGramos)} y busca ${metaRepsSugerida} repeticiones por serie`;

      return {
        id: ejercicio.id,
        nombre: ejercicio.nombre,
        tipo: ejercicio.tipo,
        metodo: ejercicio.metodo,
        rango: ejercicio.rango,
        objetivo,
        pesoSugeridoKg: pesoSugeridoGramos === null ? null : gramosAKg(pesoSugeridoGramos),
        pesosPlanKg: plan.map((serie) =>
          serie.pesoGramos === null ? null : gramosAKg(serie.pesoGramos),
        ),
        etiquetas: plan.map((serie) => serie.etiqueta),
      };
    }),
  );

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-texto">Entrenar hoy</h1>
      <p className="mb-5 text-base text-texto-suave">
        Anota todos los ejercicios que hiciste hoy en un solo lugar. Marca cada uno y escribe sus series.
      </p>

      {ejercicios.length === 0 ? (
        <EstadoVacio
          titulo="No hay ejercicios listos"
          descripcion={avanzado ? 'Crea un ejercicio y registra su prueba inicial para poder entrenarlo aquí.' : 'Crea un ejercicio y haz su primera medición para poder anotarlo aquí.'}
        >
          <Link href="/gym/ejercicios/nuevo" className={clasesBoton()}>
            Nuevo ejercicio
          </Link>
        </EstadoVacio>
      ) : (
        <FormularioEntrenamiento ejercicios={ejercicios} hoy={hoyBogota()} avanzado={avanzado} />
      )}
    </>
  );
}
