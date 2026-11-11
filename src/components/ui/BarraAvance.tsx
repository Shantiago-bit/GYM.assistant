export function BarraAvance({ porcentaje, etiqueta }: { porcentaje: number; etiqueta: string }) {
  const valor = Math.min(Math.max(Math.round(porcentaje), 0), 100);

  return (
    <div
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={valor}
      aria-valuetext={`${valor} %`}
      className="h-2.5 w-full overflow-hidden rounded-full bg-primario-suave"
    >
      <div className="h-full rounded-full bg-primario transition-[width] duration-500" style={{ width: `${valor}%` }} />
    </div>
  );
}
