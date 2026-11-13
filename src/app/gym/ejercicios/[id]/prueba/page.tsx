import Link from 'next/link';
import { FormularioSeries } from '@/components/gym/FormularioSeries';
import { Aviso } from '@/components/ui/Aviso';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { exigirSesionDePagina } from '@/lib/auth/sesion';
import { obtenerPerfil } from '@/lib/dataService';
import { gramosAKg } from '@/lib/formato';
import { MENSAJES } from '@/lib/reglas/errores';
import { cargarEjercicio } from '../cargar';

export const metadata = { title: 'Primera medición · Gym Assistant' };

export default async function PruebaInicialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { id: usuarioId } = await exigirSesionDePagina();
  const [{ ejercicio, tienePruebaInicial }, perfil] = await Promise.all([cargarEjercicio(id), obtenerPerfil(usuarioId)]);
  const avanzado = perfil?.modoAvanzado ?? false;
  const detalle = `/gym/ejercicios/${id}` as const;
  const [min, max] = ejercicio.rango;
  const esPeso = ejercicio.tipo === 'peso';

  return (
    <>
      <Link
        href={detalle}
        className="inline-flex min-h-11 items-center text-sm font-medium text-primario underline-offset-4 hover:underline"
      >
        Volver a {ejercicio.nombre}
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-bold text-texto">{avanzado ? 'Prueba inicial' : 'Primera medición'}</h1>
      <p className="mb-5 text-base text-texto-suave">
        {avanzado
          ? `Registra tu primera medición de ${ejercicio.nombre}. Fija tu punto de partida.`
          : `Anota cuántas repeticiones logras hoy en ${ejercicio.nombre}. Así sabremos desde dónde empezar.`}
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
            <Tarjeta className="bg-primario-suave lg:sticky lg:top-6" data-guia="prueba-instrucciones">
              <h2 className="text-base font-semibold text-texto">
                {avanzado ? 'Cómo hacer la prueba' : 'Cómo hacerla'}
              </h2>
              {avanzado ? (
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-texto-suave">
                  <li>Calienta con una o dos series ligeras y márcalas como &quot;Aproximación&quot;.</li>
                  <li>
                    Haz tus series de trabajo con buena técnica dentro del rango{' '}
                    <span className="tabular-nums">
                      {min}–{max}
                    </span>{' '}
                    reps.
                  </li>
                  <li>El peso más alto de tus series de trabajo será tu peso de referencia.</li>
                  <li>Si puedes, anota el RIR: mejora el 1RM estimado y las recomendaciones.</li>
                </ul>
              ) : (
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-base text-texto">
                  <li>
                    {esPeso
                      ? `Elige un peso con el que puedas hacer entre ${min} y ${max} repeticiones con buena técnica.`
                      : `Haz entre ${min} y ${max} repeticiones por serie con buena técnica. Si no llegas, anota las que logres.`}
                  </li>
                  <li>Haz tus series y anota cuántas repeticiones hiciste en cada una{esPeso ? ' y con qué peso' : ''}.</li>
                  {esPeso ? <li>Con tu serie más pesada fijamos tu punto de partida.</li> : null}
                </ol>
              )}
            </Tarjeta>
          </aside>
          <Tarjeta className="lg:col-span-8">
            <FormularioSeries
              tipo={ejercicio.tipo}
              urlEnvio={`/api/gym/ejercicios/${id}/prueba`}
              destino={detalle}
              textoBoton={avanzado ? 'Guardar prueba inicial' : 'Guardar mi primera medición'}
              // Sin peso de partida (0 kg en el modo sencillo), los campos de peso arrancan vacíos.
              pesoInicialKg={ejercicio.pesoRefGramos ? gramosAKg(ejercicio.pesoRefGramos) : null}
              avanzado={avanzado}
            />
          </Tarjeta>
        </div>
      )}
    </>
  );
}
