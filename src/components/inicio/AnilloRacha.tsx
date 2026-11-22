import Link from 'next/link';
import { NumeroAnimado } from '@/components/ui/Movimiento';

const RADIO = 34;
const GROSOR = 8;
const LADO = (RADIO + GROSOR) * 2;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

// Anillo de racha: se llena con los días planificados de la semana que ya se entrenaron; en el centro, la racha.
// Al tocarlo se abre el detalle de la racha en el perfil.
export function AnilloRacha({
  racha,
  fraccion,
  texto,
}: {
  racha: number;
  fraccion: number;
  texto: string;
}) {
  const lleno = Math.min(1, Math.max(0, fraccion)) * CIRCUNFERENCIA;
  return (
    <Link
      href="/gym/perfil#racha"
      data-guia="anillo-racha"
      aria-label={`${texto}. Ver el detalle de tu racha`}
      className="group flex shrink-0 flex-col items-center gap-1 rounded-tarjeta p-1 transition-transform duration-150 ease-out hover:-translate-y-0.5 motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
    >
      <span className="relative block h-20 w-20 sm:h-24 sm:w-24" aria-hidden="true">
        <svg viewBox={`0 0 ${LADO} ${LADO}`} className="h-full w-full -rotate-90" aria-hidden="true">
          <circle
            cx={LADO / 2}
            cy={LADO / 2}
            r={RADIO}
            fill="none"
            stroke="var(--color-primario-suave)"
            strokeWidth={GROSOR}
          />
          {lleno > 0 ? (
            <circle
              cx={LADO / 2}
              cy={LADO / 2}
              r={RADIO}
              fill="none"
              stroke="var(--color-primario)"
              strokeWidth={GROSOR}
              strokeLinecap="round"
              strokeDasharray={`${lleno} ${CIRCUNFERENCIA}`}
              // Se llena desde 0 al aparecer; con movimiento reducido, ya lleno.
              className="anim-trazo"
              style={{ ['--largo-trazo' as string]: `${lleno}` }}
            />
          ) : null}
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-titulos text-2xl font-bold tabular-nums text-texto sm:text-3xl">
          <NumeroAnimado valor={racha} />
        </span>
      </span>
      <span
        className="text-sm font-semibold text-texto-suave group-hover:text-texto"
        aria-hidden="true"
      >
        🔥 {racha} {racha === 1 ? 'día' : 'días'}
      </span>
    </Link>
  );
}
