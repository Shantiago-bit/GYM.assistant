// Sesiones por semana (las últimas 12) en barras SVG hechas a mano. Lo lee un lector de pantalla por la tabla
// oculta; el dibujo es decorativo.

interface Props {
  semanas: { lunes: string; sesiones: number }[];
}

const ANCHO = 360;
const ALTO = 140;
const MARGEN_INFERIOR = 22;
const MARGEN_SUPERIOR = 16;

const etiqueta = (lunes: string) => {
  const [, mes, dia] = lunes.split('-');
  return `${Number(dia)}/${Number(mes)}`;
};

export function GraficoSemanas({ semanas }: Props) {
  const maximo = Math.max(1, ...semanas.map((s) => s.sesiones));
  const paso = ANCHO / Math.max(1, semanas.length);
  const anchoBarra = paso * 0.62;
  const altoUtil = ALTO - MARGEN_INFERIOR - MARGEN_SUPERIOR;
  const total = semanas.reduce((suma, s) => suma + s.sesiones, 0);

  return (
    <figure className="m-0">
      <figcaption className="mb-2 text-sm font-medium text-texto-suave">
        Sesiones por semana (últimas {semanas.length}): {total} en total
      </figcaption>
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" aria-hidden="true" focusable="false">
        <line x1="0" x2={ANCHO} y1={ALTO - MARGEN_INFERIOR} y2={ALTO - MARGEN_INFERIOR} className="stroke-borde-fuerte" strokeWidth="1" />
        {semanas.map((semana, i) => {
          const alto = (semana.sesiones / maximo) * altoUtil;
          const x = i * paso + (paso - anchoBarra) / 2;
          const y = ALTO - MARGEN_INFERIOR - alto;
          return (
            <g key={semana.lunes}>
              {semana.sesiones > 0 ? <rect x={x} y={y} width={anchoBarra} height={alto} rx="3" className="fill-primario" /> : null}
              {semana.sesiones > 0 ? (
                <text x={x + anchoBarra / 2} y={y - 4} textAnchor="middle" className="fill-texto text-[10px] font-semibold">
                  {semana.sesiones}
                </text>
              ) : null}
              {i % 2 === semanas.length % 2 ? null : (
                <text x={x + anchoBarra / 2} y={ALTO - 6} textAnchor="middle" className="fill-texto-suave text-[10px]">
                  {etiqueta(semana.lunes)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>Sesiones por semana</caption>
        <thead>
          <tr>
            <th scope="col">Semana del lunes</th>
            <th scope="col">Sesiones</th>
          </tr>
        </thead>
        <tbody>
          {semanas.map((semana) => (
            <tr key={semana.lunes}>
              <td>{semana.lunes}</td>
              <td>{semana.sesiones}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
