'use client';

import { useState, type CSSProperties } from 'react';
import { BaldosaChrono } from '@/components/marca/BaldosaChrono';
import { Icono, type NombreIcono } from '@/components/ui/Icono';
import { NOMBRE_APP } from '@/lib/config/marca';
import { TEXTO_HOY, textoRacha, type ContextoChat } from '@/lib/chat/contextoVisible';
import { PREGUNTAS_POR_TEMA } from '@/lib/chat/sugerencias';

const PREGUNTA_HOY: Record<ContextoChat['estadoHoy'], string> = {
  entrenar: '¿Qué entreno hoy?',
  descanso: '¿Qué hago en mi día de descanso?',
  entrenado: '¿Cómo me fue en el entrenamiento de hoy?',
};

// El estado vacío: la baldosa de CHRONO con un halo que respira, el saludo, 3 sugerencias inteligentes (se ENVÍAN
// al tocarlas), la fila "Tu día" con datos reales y chips por tema (estas dos ESCRIBEN la pregunta en el campo).
export function EstadoVacioChat({
  contexto,
  alEnviar,
  alEscribir,
}: {
  contexto: ContextoChat;
  alEnviar: (texto: string) => void;
  alEscribir: (texto: string) => void;
}) {
  const [tema, setTema] = useState<string | null>(null);
  const preguntas = PREGUNTAS_POR_TEMA.find((t) => t.tema === tema)?.preguntas ?? [];
  const listo = contexto.ejercicios.find((ejercicio) => ejercicio.listo) ?? null;
  const tuDia: { etiqueta: string; valor: string; icono: NombreIcono; pregunta: string }[] = [
    { etiqueta: 'Hoy', valor: TEXTO_HOY[contexto.estadoHoy], icono: 'cronometro', pregunta: PREGUNTA_HOY[contexto.estadoHoy] },
    { etiqueta: 'Racha actual', valor: textoRacha(contexto.racha), icono: 'trofeo', pregunta: '¿Cómo mantengo mi racha?' },
    ...(listo
      ? [{ etiqueta: 'Listo para subir', valor: listo.nombre, icono: 'flechaArriba' as const, pregunta: `¿Cuánto subo en ${listo.nombre}?` }]
      : []),
  ];

  return (
    <div className="flex min-h-full flex-col justify-center py-4">
      <div className="chrono-entrada flex flex-col items-center text-center" style={{ '--orden': 1 } as CSSProperties}>
        <span className="relative mb-4 inline-flex">
          <span aria-hidden="true" className="halo-chrono absolute -inset-6 rounded-full" />
          <BaldosaChrono tamano="lg" className="relative" />
        </span>
        <h2 className="text-titulo-2 font-bold text-texto">
          {contexto.saludo}
          {contexto.apodo ? `, ${contexto.apodo}` : ''}
        </h2>
        <p className="mt-1 max-w-md text-base text-texto-suave">
          Soy CHRONO, tu entrenador en {NOMBRE_APP}. Conozco tus ejercicios, tu racha y tus récords.
        </p>
      </div>

      <ul aria-label="Sugerencias" className="anim-escalonado chrono-entrada mt-6 grid gap-3 sm:grid-cols-3" style={{ '--orden': 2 } as CSSProperties}>
        {contexto.sugerencias.map((sugerencia) => (
          <li key={sugerencia.texto}>
            <button
              type="button"
              onClick={() => alEnviar(sugerencia.texto)}
              className="flex h-full min-h-28 w-full flex-col items-start gap-2 rounded-tarjeta border border-borde bg-superficie p-4 text-left shadow-suave transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-primario motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
            >
              <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primario-suave text-primario">
                <Icono nombre={sugerencia.icono} className="h-6 w-6" />
              </span>
              <span className="text-base font-semibold text-texto">{sugerencia.texto}</span>
              <span className="text-sm text-texto-suave">{sugerencia.detalle}</span>
            </button>
          </li>
        ))}
      </ul>

      <section aria-label="Tu día" className="chrono-entrada mt-5" style={{ '--orden': 2 } as CSSProperties}>
        <p className="text-sm font-semibold uppercase tracking-wide text-primario">Tu día</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {tuDia.map((dato) => (
            <li key={dato.etiqueta}>
              <button
                type="button"
                onClick={() => alEscribir(dato.pregunta)}
                className="flex min-h-14 w-full items-center gap-3 rounded-gym border border-borde bg-fondo px-3 py-2 text-left hover:border-primario focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
              >
                <Icono nombre={dato.icono} className="h-5 w-5 shrink-0 text-primario" />
                <span className="min-w-0">
                  <span className="block text-sm text-texto-suave">{dato.etiqueta}</span>
                  <span className="block truncate text-sm font-semibold text-texto">{dato.valor}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

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
