'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MarkdownChat } from '@/components/gym/MarkdownChat';
import { SimboloChrono } from '@/components/marca/SimboloChrono';
import { Icono } from '@/components/ui/Icono';

const CLASES_ACCION =
  'inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-texto-suave hover:bg-primario-suave hover:text-texto focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario';

// Un mensaje de CHRONO: sin burbuja, a todo el ancho de la columna, con el símbolo solo en el primero de cada
// turno. "Copiar" y (en el último) "Regenerar" aparecen al pasar el cursor o enfocar; en pantallas táctiles,
// siempre.
export function MensajeChrono({
  texto,
  conSimbolo,
  alRegenerar,
  children,
}: {
  texto: string;
  conSimbolo: boolean;
  alRegenerar?: (() => void) | undefined;
  children?: ReactNode;
}) {
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso para el portapapeles: no se muestra "Copiado".
    }
  };

  return (
    <article aria-label="CHRONO dijo" className="mensaje-chrono anim-entrada group flex gap-3">
      <div className="w-7 shrink-0 pt-0.5" aria-hidden="true">
        {conSimbolo ? <SimboloChrono variante="mono" tamano={26} className="text-primario" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        {texto ? (
          <div className="text-base leading-[1.6] text-texto">
            <MarkdownChat texto={texto} />
          </div>
        ) : null}
        {children ? <div className="mt-3 flex flex-col gap-3">{children}</div> : null}
        {texto ? (
          <div className="acciones-mensaje mt-1 flex flex-wrap gap-1">
            <button type="button" onClick={() => void copiar()} className={CLASES_ACCION}>
              <Icono nombre={copiado ? 'check' : 'copiar'} className="h-4 w-4" />
              <span aria-live="polite">{copiado ? 'Copiado' : 'Copiar'}</span>
            </button>
            {alRegenerar ? (
              <button
                type="button"
                onClick={alRegenerar}
                className={CLASES_ACCION}
                title="Vuelve a enviar tu última pregunta: cuenta para tu límite de mensajes de hoy"
              >
                <Icono nombre="regenerar" className="h-4 w-4" />
                Regenerar
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
