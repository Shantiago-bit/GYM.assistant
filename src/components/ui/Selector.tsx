import { useId, type SelectHTMLAttributes } from 'react';
import { CLASES_CONTROL } from '@/components/ui/Campo';

interface PropiedadesSelector extends SelectHTMLAttributes<HTMLSelectElement> {
  etiqueta: string;
  opciones: { valor: string; texto: string }[];
}

export function Selector({ etiqueta, opciones, id, className = '', ...resto }: PropiedadesSelector) {
  const idGenerado = useId();
  const idCampo = id ?? idGenerado;

  return (
    <div>
      <label htmlFor={idCampo} className="mb-1 block text-sm font-medium text-texto">
        {etiqueta}
      </label>
      <select id={idCampo} className={`${CLASES_CONTROL} ${className}`} {...resto}>
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.texto}
          </option>
        ))}
      </select>
    </div>
  );
}
