import type { Route } from 'next';
import Link from 'next/link';
import { Inicial } from '@/components/inicio/TarjetasProgreso';
import { clasesBoton } from '@/components/ui/Boton';
import { Icono, type NombreIcono } from '@/components/ui/Icono';
import type { EjercicioListado } from '@/lib/dataService';
import type { TonoFrase } from '@/lib/reglas/inicio';

const TONO: Record<TonoFrase, { clase: string; icono: NombreIcono }> = {
  subir: { clase: 'text-subir', icono: 'flechaArriba' },
  mantener: { clase: 'text-mantener', icono: 'flechaDerecha' },
  descarga: { clase: 'text-descarga', icono: 'flechaAbajo' },
};

// Línea de tendencia propia, sin ejes: solo la forma del progreso de las últimas sesiones.
export function MiniTendencia({
  valores,
  descripcion,
}: {
  valores: number[];
  descripcion: string;
}) {
  const ancho = 96;
  const alto = 32;
  if (valores.length < 2) {
    return (
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        className="h-8 w-24"
        role="img"
        aria-label={descripcion}
      >
        <line
          x1={4}
          y1={alto / 2}
          x2={ancho - 4}
          y2={alto / 2}
          stroke="var(--color-borde)"
          strokeWidth={2}
          strokeDasharray="4 4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const rango = maximo - minimo || 1;
  const puntos = valores.map((valor, indice) => {
    const x = 4 + (indice / (valores.length - 1)) * (ancho - 8);
    const y = maximo === minimo ? alto / 2 : alto - 4 - ((valor - minimo) / rango) * (alto - 8);
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10] as const;
  });
  const ruta = puntos.map(([x, y], indice) => `${indice === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
  const largo = Math.round(
    puntos
      .slice(1)
      .reduce(
        (total, [x, y], indice) =>
          total + Math.hypot(x - puntos[indice]![0], y - puntos[indice]![1]),
        0,
      ),
  );
  const [ultimoX, ultimoY] = puntos.at(-1)!;
  return (
    <svg
      viewBox={`0 0 ${ancho} ${alto}`}
      className="h-8 w-24 overflow-visible"
      role="img"
      aria-label={descripcion}
    >
      <path
        d={ruta}
        fill="none"
        stroke="var(--color-primario)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={largo}
        className="anim-trazo"
        style={{ ['--largo-trazo' as string]: `${largo}` }}
      />
      <circle cx={ultimoX} cy={ultimoY} r={3} fill="var(--color-primario)" />
    </svg>
  );
}

// Tarjeta compacta de "Mis ejercicios": quién es (inicial y tipo), qué toca (frase corta con su color) y cómo
// viene (mini tendencia).
export function TarjetaEjercicioInicio({
  ejercicio,
  frase,
  tendencia,
  descripcionTendencia,
  avanzado,
}: {
  ejercicio: EjercicioListado;
  frase: { texto: string; tono: TonoFrase };
  tendencia: number[];
  descripcionTendencia: string;
  avanzado: boolean;
}) {
  const detalle = `/gym/ejercicios/${ejercicio.id}` as const;
  const sinPrueba = ejercicio.totalSesiones === 0;
  const tono = TONO[frase.tono];
  return (
    <article className="flex h-full flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-4 shadow-suave transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-primario hover:shadow-elevada motion-reduce:transform-none">
      <div className="flex items-center gap-3">
        <Inicial nombre={ejercicio.nombre} tipo={ejercicio.tipo} />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-texto">
            {/* min-h-11: el nombre también se toca, así que mide al menos 44 px de alto. */}
            <Link
              href={detalle}
              className="flex min-h-11 items-center rounded underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
            >
              <span className="truncate">{ejercicio.nombre}</span>
            </Link>
          </h3>
          <p className="text-sm text-texto-suave">
            {ejercicio.tipo === 'peso' ? 'Con peso' : avanzado ? 'Calistenia' : 'Con tu cuerpo'}
          </p>
        </div>
        <MiniTendencia valores={tendencia} descripcion={descripcionTendencia} />
      </div>
      <p className={`flex items-center gap-1.5 text-sm font-semibold ${tono.clase}`}>
        <Icono nombre={tono.icono} className="h-4 w-4" />
        {frase.texto}
      </p>
      <div className="mt-auto flex gap-2">
        <Link
          href={(sinPrueba ? `${detalle}/prueba` : `${detalle}/sesion`) as Route}
          className={`${clasesBoton('primario')} flex-1`}
        >
          {sinPrueba
            ? avanzado
              ? 'Prueba inicial'
              : 'Primera medición'
            : avanzado
              ? 'Registrar sesión'
              : 'Anotar sesión'}
        </Link>
        <Link href={detalle} className={`${clasesBoton('secundario')} flex-1`}>
          Ver detalle
        </Link>
      </div>
    </article>
  );
}
