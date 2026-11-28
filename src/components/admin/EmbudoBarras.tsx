import type { FilaEmbudo } from '@/lib/reglas/analiticaAdmin';

const numero = (valor: number) => valor.toLocaleString('es-CO');
const porcentaje = (valor: number | null) => (valor === null ? '—' : `${valor.toLocaleString('es-CO')} %`);

// Embudo de activación en barras horizontales. La información está en el texto de cada paso (cantidad, % del total
// y % del paso anterior); la barra es decorativa (aria-hidden) y su ancho es el % del total. La lista ordenada
// conserva el orden de los pasos para los lectores de pantalla.
export function EmbudoBarras({ embudo, titulo }: { embudo: FilaEmbudo[]; titulo: string }) {
  return (
    <ol aria-label={titulo} className="space-y-3">
      {embudo.map((fila, i) => (
        <li key={fila.paso}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold text-texto">
              {i + 1}. {fila.texto}
            </span>
            <span className="tabular-nums text-texto">
              <strong className="text-base">{numero(fila.cantidad)}</strong>
              <span className="text-texto-suave"> · {porcentaje(fila.delTotal)} del total</span>
              {i > 0 ? <span className="text-texto-suave"> · {porcentaje(fila.delAnterior)} del paso anterior</span> : null}
            </span>
          </div>
          <div aria-hidden="true" className="mt-1.5 h-3 overflow-hidden rounded-full bg-borde">
            <div className="h-full rounded-full bg-lavanda" style={{ width: `${fila.delTotal ?? 0}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
