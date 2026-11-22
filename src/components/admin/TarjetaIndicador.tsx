import { sentidoVariacion, textoVariacion, type Variacion } from '@/lib/reglas/admin';

const CLASES_SENTIDO = {
  sube: 'bg-[color:var(--admin-sube-fondo)] text-[color:var(--admin-sube-texto)]',
  baja: 'bg-[color:var(--admin-baja-fondo)] text-[color:var(--admin-baja-texto)]',
  igual: 'bg-[color:var(--admin-igual-fondo)] text-[color:var(--admin-igual-texto)]',
} as const;

const FLECHA = { sube: '↑', baja: '↓', igual: '→' } as const;

// Insignia de variación: el color acompaña a la flecha y al texto (el sentido no depende solo del color).
export function InsigniaVariacion({ variacion, frente = 'al mes anterior' }: { variacion: Variacion; frente?: string }) {
  const sentido = sentidoVariacion(variacion);
  const texto = textoVariacion(variacion);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${CLASES_SENTIDO[sentido]}`}>
      <span aria-hidden="true">{FLECHA[sentido]}</span>
      {texto}
      <span className="sr-only"> frente {frente}</span>
    </span>
  );
}

export function TarjetaIndicador({
  titulo,
  valor,
  variacion,
  detalle,
}: {
  titulo: string;
  valor: number;
  variacion: Variacion;
  detalle?: string;
}) {
  return (
    <article className="vidrio p-5">
      <h3 className="text-sm font-semibold text-texto-suave">{titulo}</h3>
      <p className="mt-2 text-4xl font-black tabular-nums tracking-tight text-texto">{valor.toLocaleString('es-CO')}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <InsigniaVariacion variacion={variacion} />
        {detalle ? <span className="text-sm text-texto-suave">{detalle}</span> : null}
      </div>
    </article>
  );
}
