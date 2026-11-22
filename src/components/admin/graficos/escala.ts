// Tope redondo del eje: 1, 2, 2,5 o 5 por una potencia de 10, por encima del mayor valor (como mínimo 1).
export function topeRedondo(mayor: number): number {
  if (mayor <= 0) return 1;
  const potencia = 10 ** Math.floor(Math.log10(mayor));
  const paso = [1, 2, 2.5, 5, 10].find((multiplo) => multiplo * potencia >= mayor) ?? 10;
  return paso * potencia;
}

export const formatoNumero = (valor: number): string => Math.round(valor).toLocaleString('es-CO');
