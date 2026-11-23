import { BaldosaAgon } from '@/components/marca/BaldosaAgon';

// Esqueleto con un brillo lavanda suave (sin brillo si se pidió menos movimiento). Se muestra al instante al cambiar de sección mientras el servidor prepara la página. Además, con este límite
// Next.js precarga cada sección del menú hasta aquí, así que el cambio se siente inmediato.
export default function CargandoGym() {
  return (
    <div role="status" aria-label="Cargando" className="space-y-5">
      <div className="flex items-center gap-3">
        <BaldosaAgon tamano="sm" className="punto-respira" />
        <div className="esqueleto h-8 w-56 rounded-boton" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((indice) => (
          <div key={indice} className="h-20 rounded-tarjeta esqueleto" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((indice) => (
          <div key={indice} className="h-44 rounded-tarjeta esqueleto" />
        ))}
      </div>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
