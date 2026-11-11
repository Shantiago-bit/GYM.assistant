// Se muestra al instante al cambiar de sección mientras el servidor prepara la página. Además, con este límite
// Next.js precarga cada sección del menú hasta aquí, así que el cambio se siente inmediato.
export default function CargandoGym() {
  return (
    <div role="status" aria-label="Cargando" className="animate-pulse space-y-5">
      <div className="h-8 w-56 rounded-gym bg-borde" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((indice) => (
          <div key={indice} className="h-20 rounded-gym border border-borde bg-superficie" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((indice) => (
          <div key={indice} className="h-44 rounded-gym border border-borde bg-superficie" />
        ))}
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
