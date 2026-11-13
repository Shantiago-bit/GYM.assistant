import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FormularioSeries } from '@/components/gym/FormularioSeries';
import { NotaMetodo, PlanSesion } from '@/components/gym/PlanSesion';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { Termino } from '@/components/ui/Termino';
import { exigirSesionDePagina } from '@/lib/auth/sesion';
import { obtenerPerfil } from '@/lib/dataService';
import { gramosAKg } from '@/lib/formato';
import { textoMetodo } from '@/lib/reglas/metodos';
import { hoyBogota } from '@/lib/reglas/fechas';
import { fraseAccion } from '@/lib/reglas/siguientePaso';
import { cargarEjercicio } from '../cargar';

export default async function RegistrarSesionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { id: usuarioId } = await exigirSesionDePagina();
  const [{ ejercicio, tienePruebaInicial, recomendacion, plan }, perfil] = await Promise.all([
    cargarEjercicio(id),
    obtenerPerfil(usuarioId),
  ]);
  const avanzado = perfil?.modoAvanzado ?? false;
  const detalle = `/gym/ejercicios/${id}` as const;

  if (!tienePruebaInicial) {
    redirect(`/gym/ejercicios/${id}/prueba`);
  }

  const [min, max] = ejercicio.rango;
  const pesoSugerido = recomendacion.pesoSugeridoGramos;

  return (
    <>
      <Link
        href={detalle}
        className="text-sm font-medium text-primario underline-offset-4 hover:underline"
      >
        Volver a {ejercicio.nombre}
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-bold text-texto">{avanzado ? 'Registrar sesión' : `Anotar ${ejercicio.nombre}`}</h1>
      <p className="mb-5 text-base text-texto-suave">
        {avanzado
          ? `${ejercicio.nombre} · ${textoMetodo(ejercicio.metodo)}`
          : 'Ya pusimos el peso que te toca. Escribe las repeticiones que hiciste y corrige el peso si usaste otro.'}
      </p>

      <div className="grid gap-6 lg:grid-cols-12">
        <aside className="lg:col-span-4">
          <Tarjeta className="bg-primario-suave lg:sticky lg:top-6" data-guia="sesion-objetivo">
            <h2 className="text-base font-semibold text-texto">Tu objetivo de hoy</h2>
            {avanzado ? (
              <p className="mb-3 mt-1 flex flex-wrap items-center text-sm tabular-nums text-texto-suave">
                <Termino id="rango">
                  Rango {min}–{max} reps
                </Termino>
                &nbsp;·&nbsp;
                <Termino id="meta">Meta {recomendacion.metaRepsSugerida} reps</Termino>
              </p>
            ) : (
              <>
                <p className="mt-1 text-base font-medium text-texto">{fraseAccion(recomendacion, ejercicio)}</p>
                <p className="mb-3 mt-1 text-sm tabular-nums text-texto-suave">
                  Repeticiones objetivo: {min} a {max}
                </p>
              </>
            )}
            <PlanSesion plan={plan} avanzado={avanzado} />
            <NotaMetodo plan={plan} />
            {avanzado ? <p className="mt-3 text-sm text-texto-suave">{recomendacion.mensaje}</p> : null}
          </Tarjeta>
        </aside>

        <Tarjeta className="lg:col-span-8">
          <FormularioSeries
            tipo={ejercicio.tipo}
            urlEnvio={`/api/gym/ejercicios/${id}/sesiones`}
            destino={detalle}
            textoBoton="Guardar sesión"
            pesoInicialKg={pesoSugerido === null ? null : gramosAKg(pesoSugerido)}
            pesosPlanKg={plan.map((serie) =>
              serie.pesoGramos === null ? null : gramosAKg(serie.pesoGramos),
            )}
            etiquetas={plan.map((serie) => serie.etiqueta)}
            fechaMaxima={hoyBogota()}
            avanzado={avanzado}
          />
        </Tarjeta>
      </div>
    </>
  );
}
