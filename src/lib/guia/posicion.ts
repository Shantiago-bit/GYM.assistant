// Ubicación de la burbuja junto al elemento resaltado, sin salirse de la pantalla.

export interface Rectangulo {
  top: number;
  left: number;
  width: number;
  height: number;
}

export type Lado = 'abajo' | 'arriba' | 'derecha' | 'izquierda' | 'centro';

export const MARGEN_FOCO = 8; // espacio entre el elemento y el borde del hueco
const SEPARACION = 12; // entre el hueco y la burbuja
const BORDE = 12; // distancia mínima a los bordes de la pantalla

// Hueco: el elemento con su margen, recortado a la pantalla.
export function huecoDe(rect: Rectangulo, ventana: { ancho: number; alto: number }): Rectangulo {
  const top = Math.max(rect.top - MARGEN_FOCO, 0);
  const left = Math.max(rect.left - MARGEN_FOCO, 0);
  const bottom = Math.min(rect.top + rect.height + MARGEN_FOCO, ventana.alto);
  const right = Math.min(rect.left + rect.width + MARGEN_FOCO, ventana.ancho);
  return { top, left, width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) };
}

const acotar = (valor: number, min: number, max: number) => Math.min(Math.max(valor, min), Math.max(min, max));

// Prueba abajo, arriba, derecha e izquierda; si ninguno cabe, la burbuja va centrada en la pantalla.
export function posicionarBurbuja(
  hueco: Rectangulo | null,
  burbuja: { ancho: number; alto: number },
  ventana: { ancho: number; alto: number },
): { top: number; left: number; lado: Lado } {
  const centrada = {
    top: Math.max((ventana.alto - burbuja.alto) / 2, BORDE),
    left: Math.max((ventana.ancho - burbuja.ancho) / 2, BORDE),
    lado: 'centro' as const,
  };
  if (!hueco) return centrada;

  const izquierdaCentrada = acotar(hueco.left + hueco.width / 2 - burbuja.ancho / 2, BORDE, ventana.ancho - burbuja.ancho - BORDE);
  const arribaCentrada = acotar(hueco.top + hueco.height / 2 - burbuja.alto / 2, BORDE, ventana.alto - burbuja.alto - BORDE);
  const abajo = hueco.top + hueco.height + SEPARACION;
  const arriba = hueco.top - SEPARACION - burbuja.alto;
  const derecha = hueco.left + hueco.width + SEPARACION;
  const izquierda = hueco.left - SEPARACION - burbuja.ancho;

  if (abajo + burbuja.alto <= ventana.alto - BORDE) return { top: abajo, left: izquierdaCentrada, lado: 'abajo' };
  if (arriba >= BORDE) return { top: arriba, left: izquierdaCentrada, lado: 'arriba' };
  if (derecha + burbuja.ancho <= ventana.ancho - BORDE) return { top: arribaCentrada, left: derecha, lado: 'derecha' };
  if (izquierda >= BORDE) return { top: arribaCentrada, left: izquierda, lado: 'izquierda' };
  return centrada;
}
