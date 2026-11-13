'use client';

import { useId, useRef } from 'react';
import { LETRAS_DIA, NOMBRES_DIA, normalizarDias } from '@/lib/reglas/racha';

const DIAS = [1, 2, 3, 4, 5, 6, 7];

const ATAJOS: { texto: string; dias: number[] }[] = [
  { texto: 'Lunes a viernes', dias: [1, 2, 3, 4, 5] },
  { texto: 'Lunes a sábado', dias: [1, 2, 3, 4, 5, 6] },
  { texto: 'Todos los días', dias: [1, 2, 3, 4, 5, 6, 7] },
  { texto: '3 días (L-X-V)', dias: [1, 3, 5] },
];

export const AYUDA_DIAS =
  'Tu racha solo cuenta estos días. Los demás son descanso y no la rompen. Puedes cambiarlos cuando quieras.';

// "¿Qué días sueles entrenar?": siete botones de selección múltiple (aria-pressed), con atajos. Con el teclado:
// Tab llega al grupo, las flechas se mueven entre días e Inicio/Fin van al primero y al último; Espacio o Enter
// marcan o desmarcan.
export function SelectorDias({
  valor,
  alCambiar,
  error,
  etiqueta = '¿Qué días sueles entrenar?',
  ayuda = AYUDA_DIAS,
}: {
  valor: number[];
  alCambiar: (dias: number[]) => void;
  error?: string | undefined;
  etiqueta?: string;
  ayuda?: string;
}) {
  const idEtiqueta = useId();
  const idAyuda = useId();
  const idError = useId();
  const botones = useRef<(HTMLButtonElement | null)[]>([]);

  const alternar = (dia: number) =>
    alCambiar(valor.includes(dia) ? valor.filter((d) => d !== dia) : normalizarDias([...valor, dia]));

  const mover = (evento: React.KeyboardEvent, indice: number) => {
    const destino =
      evento.key === 'ArrowRight' || evento.key === 'ArrowDown'
        ? (indice + 1) % DIAS.length
        : evento.key === 'ArrowLeft' || evento.key === 'ArrowUp'
          ? (indice - 1 + DIAS.length) % DIAS.length
          : evento.key === 'Home'
            ? 0
            : evento.key === 'End'
              ? DIAS.length - 1
              : null;
    if (destino !== null) {
      evento.preventDefault();
      botones.current[destino]?.focus();
    }
  };

  const iguales = (a: number[], b: number[]) => a.length === b.length && a.every((dia, i) => dia === b[i]);

  return (
    <div>
      <p id={idEtiqueta} className="mb-2 block text-sm font-medium text-slate-700">
        {etiqueta}
      </p>
      <div
        role="group"
        aria-labelledby={idEtiqueta}
        aria-describedby={error ? `${idAyuda} ${idError}` : idAyuda}
        className="flex flex-wrap gap-2"
      >
        {DIAS.map((dia, indice) => {
          const elegido = valor.includes(dia);
          return (
            <button
              key={dia}
              ref={(elemento) => {
                botones.current[indice] = elemento;
              }}
              type="button"
              aria-pressed={elegido}
              aria-label={NOMBRES_DIA[dia]}
              title={NOMBRES_DIA[dia]}
              onClick={() => alternar(dia)}
              onKeyDown={(evento) => mover(evento, indice)}
              className={`h-11 w-11 rounded-full border text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                elegido
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-emerald-200 bg-white text-slate-700 hover:bg-emerald-50'
              }`}
            >
              {LETRAS_DIA[dia]}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {ATAJOS.map((atajo) => (
          <button
            key={atajo.texto}
            type="button"
            aria-pressed={iguales(normalizarDias(valor), atajo.dias)}
            onClick={() => alCambiar(atajo.dias)}
            className="min-h-11 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50 aria-pressed:border-emerald-600 aria-pressed:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
          >
            {atajo.texto}
          </button>
        ))}
      </div>
      <p id={idAyuda} className="mt-2 text-sm text-slate-600">
        {ayuda}
      </p>
      {error ? (
        <p id={idError} role="alert" className="mt-1 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
