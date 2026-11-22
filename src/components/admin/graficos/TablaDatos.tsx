// Alternativa accesible de cada gráfico: los mismos datos en una tabla, dentro de un desplegable.
export interface FilaTabla {
  etiqueta: string;
  valores: (string | number)[];
}

export function TablaDatos({ titulo, columnas, filas }: { titulo: string; columnas: string[]; filas: FilaTabla[] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-full px-3 font-semibold text-primario underline-offset-4 hover:underline">
        Ver los datos en una tabla
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{titulo}</caption>
          <thead>
            <tr>
              {columnas.map((columna) => (
                <th key={columna} scope="col" className="border-b border-borde px-2 py-1.5 font-semibold">
                  {columna}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.etiqueta}>
                <th scope="row" className="border-b border-borde px-2 py-1.5 font-normal">
                  {fila.etiqueta}
                </th>
                {fila.valores.map((valor, indice) => (
                  <td key={indice} className="border-b border-borde px-2 py-1.5 tabular-nums">
                    {typeof valor === 'number' ? valor.toLocaleString('es-CO') : valor}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
