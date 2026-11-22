import { Icono } from '@/components/ui/Icono';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { diaSemana, LETRAS_DIA, NOMBRES_DIA, normalizarDias, type Racha } from '@/lib/reglas/racha';
import { NumeroAnimado } from '@/components/ui/Movimiento';

const sufijoDias = (cantidad: number) => (cantidad === 1 ? ' día' : ' días');

export function estadoDelDia(racha: Pick<Racha, 'hoyEsDescanso'>, entrenoHoy: boolean): string {
  if (entrenoHoy) return 'Hoy ya entrenaste';
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
    // id="racha": el anillo de racha del inicio abre /gym/perfil#racha.
    <Tarjeta id="racha" className="scroll-mt-20 space-y-3" aria-label="Racha">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-bold text-texto">
            <NumeroAnimado valor={racha.actual} sufijo={sufijoDias(racha.actual)} />
          </p>
          <p className="text-sm text-texto-suave">Racha actual</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-texto">
            <NumeroAnimado valor={racha.mejor} sufijo={sufijoDias(racha.mejor)} />
          </p>
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
      <p className="flex items-center gap-1.5 font-semibold text-texto">
        {estadoDelDia(racha, entrenoHoy)}
        {entrenoHoy ? <Icono nombre="checkCirculo" className="h-5 w-5 text-primario" /> : null}
      </p>
      {proximo ? <p className="text-sm text-texto-suave">Próximo entrenamiento: {proximo}</p> : null}
    </Tarjeta>
  );
}
