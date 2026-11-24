'use client';

import { useState, type CSSProperties } from 'react';
import { BaldosaChrono } from '@/components/marca/BaldosaChrono';
import { Icono } from '@/components/ui/Icono';
import { NOMBRE_APP } from '@/lib/config/marca';
import { PREGUNTAS_POR_TEMA, type Sugerencia } from '@/lib/chat/sugerencias';

// El estado vacío: saludo, 3 sugerencias inteligentes (se ENVÍAN al tocarlas) y chips por tema que despliegan
// preguntas (se ESCRIBEN en el campo para editarlas).
export function EstadoVacioChat({
  saludo,
  apodo,
  sugerencias,
  alEnviar,
  alEscribir,
}: {
  saludo: string;
  apodo: string;
  sugerencias: Sugerencia[];
  alEnviar: (texto: string) => void;
  alEscribir: (texto: string) => void;
}) {
  const [tema, setTema] = useState<string | null>(null);
  const preguntas = PREGUNTAS_POR_TEMA.find((t) => t.tema === tema)?.preguntas ?? [];

  return (
    <div className="flex min-h-full flex-col justify-center py-4">
      <div className="chrono-entrada flex flex-col items-center text-center" style={{ '--orden': 1 } as CSSProperties}>
        <BaldosaChrono tamano="lg" className="mb-4" />
        <h2 className="text-titulo-2 font-bold text-texto">
          {saludo}
          {apodo ? `, ${apodo}` : ''}
        </h2>
        <p className="mt-1 max-w-md text-base text-texto-suave">
          Soy CHRONO, tu entrenador en {NOMBRE_APP}. Conozco tus ejercicios, tu racha y tus récords.
        </p>
      </div>

      <ul aria-label="Sugerencias" className="anim-escalonado chrono-entrada mt-6 grid gap-3 sm:grid-cols-3" style={{ '--orden': 2 } as CSSProperties}>
        {sugerencias.map((sugerencia) => (
          <li key={sugerencia.texto}>
            <button
              type="button"
              onClick={() => alEnviar(sugerencia.texto)}
              className="flex h-full min-h-24 w-full flex-col items-start gap-3 rounded-tarjeta border border-borde bg-superficie p-4 text-left text-base font-medium text-texto shadow-suave transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-primario motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primario-suave text-primario">
                <Icono nombre={sugerencia.icono} />
              </span>
              {sugerencia.texto}
            </button>
          </li>
        ))}
      </ul>

      <div className="chrono-entrada mt-6" style={{ '--orden': 2 } as CSSProperties}>
        <p className="text-sm text-texto-suave">O elige un tema:</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {PREGUNTAS_POR_TEMA.map(({ tema: nombre }) => (
            <li key={nombre}>
              <button
                type="button"
                aria-expanded={tema === nombre}
                aria-controls="preguntas-tema"
                onClick={() => setTema((actual) => (actual === nombre ? null : nombre))}
                className="min-h-11 rounded-full border border-borde bg-superficie px-4 text-sm font-medium text-texto transition-colors hover:border-primario aria-expanded:border-primario aria-expanded:bg-primario-suave focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
              >
                {nombre}
              </button>
            </li>
          ))}
        </ul>
        <ul id="preguntas-tema" className="mt-2 flex flex-col gap-1" hidden={!tema}>
          {preguntas.map((pregunta) => (
            <li key={pregunta}>
              <button
                type="button"
                onClick={() => alEscribir(pregunta)}
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-gym px-3 py-2 text-left text-base text-texto hover:bg-primario-suave focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
              >
                {pregunta}
                <Icono nombre="lapiz" className="h-4 w-4 shrink-0 text-texto-suave" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
