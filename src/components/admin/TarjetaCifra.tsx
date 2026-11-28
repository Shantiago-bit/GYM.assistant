// Tarjeta de una cifra sin comparación con otro periodo (TarjetaIndicador siempre muestra la variación).
// `valor` llega ya en texto para poder mostrar "90 %" o "Sin envíos".
export function TarjetaCifra({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <article className="vidrio p-5">
      <h3 className="text-sm font-semibold text-texto-suave">{titulo}</h3>
      <p className="mt-2 text-4xl font-black tabular-nums tracking-tight text-texto">{valor}</p>
      {detalle ? <p className="mt-2 text-sm text-texto-suave">{detalle}</p> : null}
    </article>
  );
}
