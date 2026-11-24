'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import { textoConstelacion, type EstadoConstelacion } from '@/lib/reglas/constelacion';

// El texto visible (no decorativo) de la constelación, debajo del saludo: "Tu constelación: Casiopea · 3 de 5
// estrellas". Al tocar o enfocar el nombre se abre un globo con el mito en una línea.
export function TextoConstelacion({ estado }: { estado: EstadoConstelacion }) {
  const [abierto, setAbierto] = useState(false);
  const idGlobo = useId();
  const { nombre, mito } = estado.constelacion;

  const alTeclear = (evento: KeyboardEvent<HTMLButtonElement>) => {
    if (evento.key === 'Escape') setAbierto(false);
  };

  return (
    <div className="relative mt-1 text-sm text-texto-suave" data-guia="constelacion">
      <p>
        Tu constelación:{' '}
        <button
          type="button"
          aria-expanded={abierto}
          aria-controls={idGlobo}
          onClick={() => setAbierto((actual) => !actual)}
          onFocus={() => setAbierto(true)}
          onBlur={() => setAbierto(false)}
          onKeyDown={alTeclear}
          className="inline-flex min-h-11 items-center rounded px-0.5 font-semibold text-primario underline decoration-dotted underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primario"
        >
          {nombre}
        </button>{' '}
        · {textoConstelacion(estado)}
      </p>
      {estado.completa ? <p className="font-semibold text-texto">Esta semana completaste {nombre}</p> : null}
      <p
        id={idGlobo}
        role="status"
        className={`${abierto ? 'block' : 'hidden'} absolute left-0 top-full z-30 mt-1 max-w-xs rounded-boton border border-borde-fuerte bg-elevada px-3 py-2 text-sm text-texto shadow-elevada`}
      >
        {mito}
      </p>
    </div>
  );
}
