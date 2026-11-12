// Reglas puras del registro de envíos de correo.

export type TipoCorreo =
  | 'confirmacion'
  | 'reenvio_confirmacion'
  | 'recuperacion'
  | 'autorizacion_tutor'
  | 'reenvio_tutor'
  | 'confirmacion_tras_autorizacion'
  | 'prueba';

export type ResultadoEnvio = 'aceptado' | 'rechazado' | 'error' | 'omitido';

// Por qué una regla decidió no enviar (la respuesta a la persona es la misma que si se hubiera enviado).
export type MotivoOmision = 'cuenta_confirmada' | 'reenvio_reciente' | 'menor_pendiente' | 'menor_rechazado';

export const LARGO_MAXIMO_ERROR = 500;

export function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase();
}

// "daniel.7@gmail.com" → "d•••••7@gmail.com": primer y último carácter del usuario y el dominio completo.
export function mascaraCorreo(correo: string): string {
  const normalizado = normalizarCorreo(correo);
  const arroba = normalizado.lastIndexOf('@');
  if (arroba < 1) return '•••';
  const usuario = normalizado.slice(0, arroba);
  const dominio = normalizado.slice(arroba + 1);
  const oculto = usuario.length <= 2 ? `${usuario[0]}•••` : `${usuario[0]}•••••${usuario.at(-1)}`;
  return `${oculto}@${dominio}`;
}

// Quita del texto de un error los secretos que se le pasen (y sus variantes sin espacios) y lo recorta.
export function limpiarError(texto: string, secretos: (string | null | undefined)[]): string {
  let limpio = texto;
  for (const secreto of secretos) {
    if (!secreto) continue;
    for (const variante of new Set([secreto, secreto.replace(/\s+/g, '')])) {
      if (variante.length >= 4) limpio = limpio.split(variante).join('[oculto]');
    }
  }
  return limpio.length > LARGO_MAXIMO_ERROR ? `${limpio.slice(0, LARGO_MAXIMO_ERROR - 1)}…` : limpio;
}

const ENTIDADES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
  '&rarr;': '→',
};

// Versión de texto plano de un correo HTML: sin etiquetas, con cada enlace visible como "texto: url".
export function htmlATexto(html: string): string {
  return (
    html
      .replace(/<head[\s\S]*?<\/head>/gi, '')
      // El texto previo oculto (vista previa en la bandeja) no va en la versión de texto.
      .replace(/<div[^>]*display:\s*none[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, url: string, texto: string) => {
        const visible = texto.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        const destino = url.replace(/^mailto:/i, '');
        return visible && visible !== destino ? `${visible}: ${url}` : url;
      })
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|h1|h2|h3|tr|div|li)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&#(\d+);/g, (_, codigo: string) => String.fromCodePoint(Number(codigo)))
      .replace(/&[a-z]+;|&#39;/gi, (entidad) => ENTIDADES[entidad] ?? entidad)
      .split('\n')
      .map((linea) => linea.replace(/[ \t]+/g, ' ').trim())
      .filter((linea, indice, lineas) => linea !== '' || (indice > 0 && lineas[indice - 1] !== ''))
      .join('\n')
      .trim()
  );
}
