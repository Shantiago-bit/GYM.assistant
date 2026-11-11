import Link from 'next/link';
import { FormularioEjercicio } from '@/components/gym/FormularioEjercicio';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { ENFOQUES } from '@/lib/reglas/ejercicio';
import { METODOS } from '@/lib/reglas/metodos';

export default function NuevoEjercicioPage() {
  return (
    <>
      <Link
        href="/gym"
        className="text-sm font-medium text-primario underline-offset-4 hover:underline"
      >
        Volver a ejercicios
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold text-texto lg:text-3xl">Nuevo ejercicio</h1>

      <div className="grid gap-6 lg:grid-cols-12">
        <Tarjeta className="lg:col-span-8">
          <FormularioEjercicio />
        </Tarjeta>

        <aside className="space-y-4 lg:col-span-4">
          <Tarjeta className="lg:sticky lg:top-6" data-guia="crear-guia-rapida">
            <h2 className="text-base font-semibold text-texto">Guía rápida</h2>
            <p className="mt-1 text-sm text-texto-suave">
              Puedes cambiar el enfoque, el método y el rango después, desde el detalle del
              ejercicio.
            </p>

            <h3 className="mt-4 text-sm font-semibold text-texto">Enfoques</h3>
            <dl className="mt-1 space-y-1.5 text-sm">
              {ENFOQUES.map((enfoque) => (
                <div key={enfoque.valor}>
                  <dt className="font-medium text-texto">{enfoque.texto}</dt>
                  <dd className="text-texto-suave">{enfoque.descripcion}</dd>
                </div>
              ))}
            </dl>

            <h3 className="mt-4 text-sm font-semibold text-texto">Métodos de series</h3>
            <dl className="mt-1 space-y-1.5 text-sm">
              {METODOS.map((metodo) => (
                <div key={metodo.valor}>
                  <dt className="font-medium text-texto">
                    {metodo.texto}
                    {metodo.soloPeso ? (
                      <span className="font-normal text-texto-suave"> · solo peso</span>
                    ) : null}
                  </dt>
                  <dd className="text-texto-suave">{metodo.descripcion}</dd>
                </div>
              ))}
            </dl>

            <h3 className="mt-4 text-sm font-semibold text-texto">Cómo progresa</h3>
            <p className="mt-1 text-sm text-texto-suave">
              Doble progresión: sube repeticiones hasta el máximo del rango y, cuando lo alcances en
              las series que cuentan, la app te pedirá subir el peso y volver al mínimo.
            </p>
          </Tarjeta>
        </aside>
      </div>
    </>
  );
}
