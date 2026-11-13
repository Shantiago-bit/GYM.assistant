import Link from 'next/link';
import { BotonRestaurar } from '@/components/gym/BotonRestaurar';
import { InsigniaTipo } from '@/components/gym/InsigniaTipo';
import { Insignia } from '@/components/ui/Insignia';
import { clasesBoton } from '@/components/ui/Boton';
import type { EjercicioListado, FilaEjercicio } from '@/lib/dataService';
import { formatearFecha, formatearPeso } from '@/lib/formato';
import { textoEnfoque } from '@/lib/reglas/ejercicio';
import { textoMetodo } from '@/lib/reglas/metodos';
import { GLOSARIO } from '@/lib/textos/glosario';

export function estadoActual(ejercicio: FilaEjercicio): string {
  if (ejercicio.tipo === 'peso') {
    return formatearPeso(ejercicio.pesoRefGramos ?? 0);
  }

  return ejercicio.nivel ?? 'Sin nivel definido';
}

type Estado = 'archivado' | 'sin_prueba' | 'listo' | 'en_progreso';

function estadoDe(ejercicio: EjercicioListado): Estado {
  if (ejercicio.archivado) return 'archivado';
  // La prueba inicial es la primera sesión del ejercicio.
  if (ejercicio.totalSesiones === 0) return 'sin_prueba';
  return ejercicio.listoParaSubir ? 'listo' : 'en_progreso';
}

const BORDE: Record<Estado, string> = {
  archivado: 'border-l-borde',
  sin_prueba: 'border-l-mantener',
  listo: 'border-l-subir',
  en_progreso: 'border-l-primario',
};

function InsigniaEstado({ estado, avanzado }: { estado: Estado; avanzado: boolean }) {
  switch (estado) {
    case 'archivado':
      return <Insignia>Archivado</Insignia>;
    case 'sin_prueba':
      return <Insignia tono="mantener">{avanzado ? 'Falta prueba inicial' : 'Falta la primera medición'}</Insignia>;
    case 'listo':
      return <Insignia tono="subir">Listo para subir</Insignia>;
    case 'en_progreso':
      return null;
  }
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-texto-suave">{etiqueta}</dt>
      <dd className="truncate font-medium tabular-nums text-texto">{valor}</dd>
    </div>
  );
}

export function TarjetaEjercicio({ ejercicio, avanzado = false }: { ejercicio: EjercicioListado; avanzado?: boolean }) {
  const [min, max] = ejercicio.rango;
  const estado = estadoDe(ejercicio);
  const detalle = `/gym/ejercicios/${ejercicio.id}` as const;
  const esPeso = ejercicio.tipo === 'peso';
  // Antes de la primera medición, un ejercicio de peso del modo sencillo tiene 0 kg de referencia.
  const actual = esPeso && estado === 'sin_prueba' && !ejercicio.pesoRefGramos ? 'Por medir' : estadoActual(ejercicio);

  return (
    <article
      className={`flex h-full flex-col rounded-gym border border-l-4 border-borde bg-superficie p-4 shadow-sm transition hover:shadow-md ${BORDE[estado]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-texto">
            <Link
              href={detalle}
              className="rounded underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
            >
              {ejercicio.nombre}
            </Link>
          </h2>
          <div className="mt-1 flex flex-wrap gap-2">
            <InsigniaTipo tipo={ejercicio.tipo} />
            <Insignia>{avanzado ? textoEnfoque(ejercicio.enfoque) : GLOSARIO[ejercicio.enfoque].llano}</Insignia>
            {ejercicio.metodo === 'rectas' ? null : <Insignia>{textoMetodo(ejercicio.metodo)}</Insignia>}
            <InsigniaEstado estado={estado} avanzado={avanzado} />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm text-texto-suave">{esPeso ? 'Peso actual' : avanzado ? 'Nivel' : 'Versión'}</p>
          <p
            className={`font-bold tabular-nums text-texto ${esPeso ? 'text-2xl' : 'max-w-36 truncate text-base'}`}
            title={actual}
          >
            {actual}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-borde pt-3 text-sm">
        {avanzado ? (
          <>
            <Dato etiqueta="Rango" valor={`${min}–${max} reps`} />
            <Dato etiqueta="Meta" valor={`${ejercicio.metaReps} reps`} />
          </>
        ) : (
          <>
            <Dato etiqueta="Repeticiones objetivo" valor={`${min} a ${max}`} />
            <Dato etiqueta="A buscar" valor={`${ejercicio.metaReps} por serie`} />
          </>
        )}
        <Dato
          etiqueta="Última sesión"
          valor={ejercicio.ultimaFecha ? formatearFecha(ejercicio.ultimaFecha) : '—'}
        />
      </dl>

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {estado === 'archivado' ? (
          <BotonRestaurar id={ejercicio.id} destino="/gym?archivados=1" variante="secundario" />
        ) : (
          <Link
            href={estado === 'sin_prueba' ? `${detalle}/prueba` : `${detalle}/sesion`}
            className={`${clasesBoton('primario')} flex-1 sm:flex-none`}
          >
            {estado === 'sin_prueba'
              ? avanzado
                ? 'Hacer prueba inicial'
                : 'Hacer la primera medición'
              : avanzado
                ? 'Registrar sesión'
                : 'Anotar sesión'}
          </Link>
        )}
        <Link href={detalle} className={`${clasesBoton('secundario')} flex-1 sm:flex-none`}>
          Ver detalle
        </Link>
      </div>
    </article>
  );
}
