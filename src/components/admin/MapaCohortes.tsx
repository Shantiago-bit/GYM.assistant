import { intensidadCelda, type CeldaCohorte, type Cohorte } from '@/lib/reglas/analiticaAdmin';

// Los lunes llegan como días de Bogotá (AAAA-MM-DD): se formatean en UTC para no correrlos un día.
const DIA = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const DIA_LARGO = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const deDia = (dia: string) => new Date(`${dia}T00:00:00Z`);
const numero = (valor: number) => valor.toLocaleString('es-CO');

// Color de la celda: --color-primario mezclado con el fondo de la tarjeta según el %. Solo tokens (color-mix sobre
// la variable, nunca un hex). El texto cumple 4,5:1 con cualquier intensidad (tests/accesibilidad/contraste.test.ts),
// y el color nunca es la única señal: cada celda dice su porcentaje.
const fondoCelda = (celda: CeldaCohorte) => {
  const intensidad = intensidadCelda(celda);
  return intensidad === 0 ? undefined : { backgroundColor: `color-mix(in srgb, var(--color-primario) ${Math.round(intensidad * 100)}%, transparent)` };
};

function Celda({ celda, cohorte }: { celda: CeldaCohorte; cohorte: Cohorte }) {
  if (celda.estado === 'futura') {
    return (
      <td className="px-2 py-2 text-center text-texto-suave">
        <span aria-hidden="true">·</span>
        <span className="sr-only">Todavía no</span>
      </td>
    );
  }
  const texto = celda.porcentaje === null ? '—' : `${numero(celda.porcentaje)} %`;
  return (
    <td
      className="px-2 py-2 text-center tabular-nums text-texto"
      style={fondoCelda(celda)}
      title={`${numero(celda.activas)} de ${numero(cohorte.registradas)} personas`}
    >
      {texto}
      {celda.estado === 'en_curso' ? (
        <>
          <span aria-hidden="true">*</span>
          <span className="sr-only"> (semana en curso)</span>
        </>
      ) : null}
    </td>
  );
}

// Mapa de calor de retención como tabla: filas = cohortes (semana de registro), columnas = semanas siguientes.
// Los encabezados de fila y de columna (scope) dan el contexto de cada celda al lector de pantalla.
export function MapaCohortes({ cohortes, promedio, titulo }: { cohortes: Cohorte[]; promedio: (number | null)[]; titulo: string }) {
  const semanas = cohortes[0]?.celdas.length ?? 0;
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`${titulo} (se desplaza de lado)`}>
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <caption className="sr-only">
          {titulo}. Cada fila es la semana en que se registraron las personas; cada columna, el porcentaje de ellas que
          registró al menos una sesión esa semana siguiente.
        </caption>
        <thead>
          <tr className="border-b border-borde">
            <th scope="col" className="px-2 py-2 text-left font-semibold text-texto">Semana de registro</th>
            <th scope="col" className="px-2 py-2 text-right font-semibold text-texto">Personas</th>
            {Array.from({ length: semanas }, (_, i) => (
              <th key={i} scope="col" className="px-2 py-2 text-center font-semibold text-texto">
                <span aria-hidden="true">S{i + 1}</span>
                <span className="sr-only">Semana {i + 1} después</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohortes.map((cohorte) => (
            <tr key={cohorte.cohorte} className="border-b border-borde">
              <th scope="row" className="whitespace-nowrap px-2 py-2 text-left font-normal text-texto">
                <span aria-hidden="true">{DIA.format(deDia(cohorte.cohorte))}</span>
                <span className="sr-only">Semana del {DIA_LARGO.format(deDia(cohorte.cohorte))}</span>
              </th>
              <td className="px-2 py-2 text-right tabular-nums text-texto">{numero(cohorte.registradas)}</td>
              {cohorte.celdas.map((celda) => (
                <Celda key={celda.semana} celda={celda} cohorte={cohorte} />
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={2} className="px-2 py-2 text-left font-semibold text-texto">
              Promedio (semanas cerradas)
            </th>
            {promedio.map((valor, i) => (
              <td key={i} className="px-2 py-2 text-center font-semibold tabular-nums text-texto">
                {valor === null ? '—' : `${numero(valor)} %`}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
