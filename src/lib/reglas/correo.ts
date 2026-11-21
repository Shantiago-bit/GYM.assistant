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
export type MotivoOmision =
  'cuenta_confirmada' | 'reenvio_reciente' | 'menor_pendiente' | 'menor_rechazado';

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
  return limpio.length > LARGO_MAXIMO_ERROR
    ? `${limpio.slice(0, LARGO_MAXIMO_ERROR - 1)}…`
    : limpio;
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
      .replace(
        /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
        (_, url: string, texto: string) => {
          const visible = texto
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          const destino = url.replace(/^mailto:/i, '');
          return visible && visible !== destino ? `${visible}: ${url}` : url;
        },
      )
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

// ---------- Proveedor de envío (Gmail o Resend) ----------

export type ProveedorCorreo = 'gmail' | 'resend';
export type PreferenciaProveedor = ProveedorCorreo | 'auto';

// CORREO_PROVEEDOR: 'gmail', 'resend' o 'auto' (por defecto, y para cualquier otro valor).
export function leerPreferenciaProveedor(valor: string | undefined): PreferenciaProveedor {
  const limpio = valor?.trim().toLowerCase();
  return limpio === 'gmail' || limpio === 'resend' ? limpio : 'auto';
}

// Dominio del remitente de RESEND_FROM, con o sin nombre: "Gym Assistant <no-responder@midominio.com>".
export function dominioDelRemitente(remitente: string | undefined): string | null {
  if (!remitente?.trim()) return null;
  const direccion = /<([^>]+)>/.exec(remitente)?.[1] ?? remitente;
  const dominio = direccion.trim().split('@')[1]?.trim().toLowerCase();
  return dominio || null;
}

// El remitente de prueba de Resend (onboarding@resend.dev) solo entrega al dueño de la cuenta: no cuenta como
// dominio propio.
export function esDominioPropio(remitente: string | undefined): boolean {
  const dominio = dominioDelRemitente(remitente);
  return dominio !== null && dominio !== 'resend.dev' && !dominio.endsWith('.resend.dev');
}

// Orden en que se intenta enviar. El segundo, si existe, solo se usa cuando el primero falla antes de aceptar
// el correo. Resend solo sirve de respaldo con dominio propio y clave (si no, solo entregaría al dueño).
export function ordenDeProveedores(config: {
  preferencia: PreferenciaProveedor;
  gmailConfigurado: boolean;
  resendConDominioPropio: boolean;
}): ProveedorCorreo[] {
  const { preferencia, gmailConfigurado, resendConDominioPropio } = config;
  if (preferencia === 'gmail') return resendConDominioPropio ? ['gmail', 'resend'] : ['gmail'];
  if (preferencia === 'resend') return gmailConfigurado ? ['resend', 'gmail'] : ['resend'];
  if (resendConDominioPropio) return gmailConfigurado ? ['resend', 'gmail'] : ['resend'];
  if (gmailConfigurado) return ['gmail'];
  // Como antes: sin Gmail ni dominio propio queda Resend con su remitente de prueba.
  return ['resend'];
}

// Códigos de nodemailer que significan que Gmail no llegó a aceptar el correo (no hubo conexión o la cuenta
// fue rechazada). Con otros errores no se sabe si el correo salió, y no se reintenta para no duplicarlo.
const FALLOS_GMAIL_ANTES_DE_ACEPTAR = new Set([
  'EAUTH',
  'ECONNECTION',
  'ETIMEDOUT',
  'ESOCKET',
  'EDNS',
  'ENOTFOUND',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ETLS',
]);

export function falloGmailAntesDeAceptar(error: unknown): boolean {
  const codigo = (error as { code?: unknown } | null)?.code;
  const respuesta = (error as { responseCode?: unknown } | null)?.responseCode;
  return (
    (typeof codigo === 'string' && FALLOS_GMAIL_ANTES_DE_ACEPTAR.has(codigo)) ||
    respuesta === 535 ||
    respuesta === 534 ||
    respuesta === 530
  );
}

// Resend: clave inválida o sin permiso (401/403, incluido un dominio sin verificar) o sin conexión.
const NOMBRES_RESEND_ANTES_DE_ACEPTAR = new Set([
  'missing_api_key',
  'invalid_api_key',
  'restricted_api_key',
  'invalid_access',
  'invalid_from_address',
]);

export function falloResendAntesDeAceptar(
  error: { name?: unknown; statusCode?: unknown } | null | undefined,
): boolean {
  if (!error) return false;
  const estado = typeof error.statusCode === 'number' ? error.statusCode : null;
  // El SDK informa un fallo de red como application_error sin código HTTP.
  const sinConexion = error.name === 'application_error' && estado === null;
  return (
    sinConexion ||
    estado === 401 ||
    estado === 403 ||
    (typeof error.name === 'string' && NOMBRES_RESEND_ANTES_DE_ACEPTAR.has(error.name))
  );
}
