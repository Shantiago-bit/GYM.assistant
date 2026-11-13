import { Tarjeta } from '@/components/ui/Tarjeta';
import { diaSemana, LETRAS_DIA, NOMBRES_DIA, normalizarDias, type Racha } from '@/lib/reglas/racha';

const dias = (cantidad: number) => `${cantidad} ${cantidad === 1 ? 'día' : 'días'}`;

export function estadoDelDia(racha: Pick<Racha, 'hoyEsDescanso'>, entrenoHoy: boolean): string {
  if (entrenoHoy) return 'Hoy ya entrenaste ✓';
  return racha.hoyEsDescanso ? 'Hoy descansas: tu racha sigue' : 'Hoy toca entrenar';
}

// Racha actual y mejor, los días elegidos y qué toca hoy.
export function TarjetaRacha({
  racha,
  diasElegidos,
  entrenoHoy,
}: {
  racha: Racha;
  diasElegidos: number[];
  entrenoHoy: boolean;
}) {
  const proximo = racha.proximoDiaPlanificado ? NOMBRES_DIA[diaSemana(racha.proximoDiaPlanificado)] : null;
  return (
    <Tarjeta className="space-y-3" aria-label="Racha">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-bold tabular-nums text-texto">{dias(racha.actual)}</p>
          <p className="text-sm text-texto-suave">Racha actual</p>
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums text-texto">{dias(racha.mejor)}</p>
          <p className="text-sm text-texto-suave">Mejor racha</p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-1.5" aria-label="Tus días de entrenamiento">
        {normalizarDias(diasElegidos).map((dia) => (
          <li
            key={dia}
            title={NOMBRES_DIA[dia]}
            className="rounded-full bg-primario-suave px-2.5 py-0.5 text-sm font-semibold text-primario"
          >
            <span aria-hidden="true">{LETRAS_DIA[dia]}</span>
            <span className="sr-only">{NOMBRES_DIA[dia]}</span>
          </li>
        ))}
      </ul>
      <p className="font-semibold text-texto">{estadoDelDia(racha, entrenoHoy)}</p>
      {proximo ? <p className="text-sm text-texto-suave">Próximo entrenamiento: {proximo}</p> : null}
    </Tarjeta>
  );
}
