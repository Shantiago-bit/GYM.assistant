import Link from 'next/link';
import { clasesBoton } from '@/components/ui/Boton';

const PASOS = [
  { titulo: 'Crea un ejercicio', texto: 'Su nombre y si es con peso o con tu cuerpo.' },
  {
    titulo: 'Haz la primera medición',
    texto: 'Cuántas repeticiones logras hoy: tu punto de partida.',
  },
  { titulo: 'Anota tu primera sesión', texto: 'La app te dirá qué peso usar y cuándo subirlo.' },
];

// Ilustración propia: una mancuerna sobre una línea de progreso que sube.
function Ilustracion() {
  return (
    <svg
      viewBox="0 0 200 120"
      className="mx-auto h-28 w-auto sm:h-32"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 104 C 52 100, 70 84, 100 78 S 160 46, 188 22"
        fill="none"
        className="stroke-lavanda"
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="2 10"
      />
      <circle cx={188} cy={22} r={6} className="fill-lavanda" />
      <g transform="translate(100 64) rotate(-18)">
        <rect x={-34} y={-3.5} width={68} height={7} rx={3.5} className="fill-primario-fuerte" />
        <rect x={-44} y={-20} width={12} height={40} rx={4} className="fill-primario" />
        <rect x={-54} y={-14} width={10} height={28} rx={4} className="fill-primario" />
        <rect x={32} y={-20} width={12} height={40} rx={4} className="fill-primario" />
        <rect x={44} y={-14} width={10} height={28} rx={4} className="fill-primario" />
      </g>
    </svg>
  );
}

// Cuenta sin ejercicios: qué hacer en tres pasos y un solo botón.
export function EstadoVacioInicio() {
  return (
    <section
      aria-labelledby="titulo-vacio"
      className="anim-entrada rounded-tarjeta border border-borde bg-superficie px-5 py-8 text-center shadow-suave sm:px-8"
    >
      <Ilustracion />
      <h2 id="titulo-vacio" className="mt-4 font-titulos text-titulo-2 font-bold text-texto">
        Empecemos tu progreso
      </h2>
      <ol className="mx-auto mt-5 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
        {PASOS.map((paso, indice) => (
          <li key={paso.titulo} className="flex gap-3 rounded-boton bg-fondo p-3">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primario-suave font-bold text-primario"
            >
              {indice + 1}
            </span>
            <span>
              <span className="block font-semibold text-texto">{paso.titulo}</span>
              <span className="block text-sm text-texto-suave">{paso.texto}</span>
            </span>
          </li>
        ))}
      </ol>
      <Link
        href="/gym/ejercicios/nuevo"
        className={`${clasesBoton()} mt-6`}
        data-guia="nuevo-ejercicio"
      >
        Crear mi primer ejercicio
      </Link>
    </section>
  );
}
