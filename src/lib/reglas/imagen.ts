// Tipo real de una imagen según sus primeros bytes ("números mágicos"), sin fiarse de la extensión
// ni del tipo que declara el navegador.
export type TipoImagen = 'image/jpeg' | 'image/png' | 'image/webp';

const empiezaCon = (bytes: Uint8Array, firma: number[], desde = 0) =>
  firma.every((byte, indice) => bytes[desde + indice] === byte);

export function detectarTipoImagen(bytes: Uint8Array): TipoImagen | null {
  if (empiezaCon(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (empiezaCon(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  // RIFF....WEBP
  if (empiezaCon(bytes, [0x52, 0x49, 0x46, 0x46]) && empiezaCon(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp';
  }
  return null;
}
