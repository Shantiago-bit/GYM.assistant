import { useId, type InputHTMLAttributes } from 'react';

export const CLASES_CONTROL =
  'min-h-11 w-full rounded-gym border border-borde bg-superficie px-3 py-2 text-base text-texto outline-none transition focus:border-primario focus:ring-2 focus:ring-primario-suave';

interface PropiedadesCampo extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
  ayuda?: string | undefined;
  error?: string | undefined;
}

export function Campo({ etiqueta, ayuda, error, id, className = '', ...resto }: PropiedadesCampo) {
  const idGenerado = useId();
  const idCampo = id ?? idGenerado;
  const idDescripcion = `${idCampo}-descripcion`;
  const descripcion = error ?? ayuda;

  return (
    <div>
      <label htmlFor={idCampo} className="mb-1 block text-sm font-medium text-texto">
        {etiqueta}
      </label>
      <input
        id={idCampo}
        aria-invalid={Boolean(error)}
        aria-describedby={descripcion ? idDescripcion : undefined}
        className={`${CLASES_CONTROL} ${className}`}
        {...resto}
      />
      {descripcion ? (
        <p
          id={idDescripcion}
          className={`mt-1 text-sm ${error ? 'text-red-700' : 'text-texto-suave'}`}
        >
          {descripcion}
        </p>
      ) : null}
    </div>
  );
}
