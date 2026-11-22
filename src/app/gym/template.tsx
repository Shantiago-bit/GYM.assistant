import type { ReactNode } from 'react';

// Cada página de /gym entra con un desvanecimiento y 10 px hacia arriba (250 ms, animación CSS: no espera a
// JavaScript y el contenido es interactivo desde el primer instante). Sin animación de salida.
export default function PlantillaGym({ children }: { children: ReactNode }) {
  return <div className="anim-entrada">{children}</div>;
}
