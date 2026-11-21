// Filtro de datos personales para los informes de errores (Sentry). Funciones puras: sin red, sin variables de
// entorno y sin el SDK, para probarlas con eventos de ejemplo (privacidad.test.ts).
//
// Regla: a Sentry solo llega información técnica (tipo de error, pila, ruta con los parámetros ocultos, versión).
// Nunca correos, nombres, apodos, fechas de nacimiento, mensajes a CHRONO ni tokens.

export const OCULTO = '[oculto]';

// Claves de objetos cuyo valor nunca se envía, sea cual sea (datos de formularios, mensajes del chat, secretos).
const CLAVES_SENSIBLES =
  /^(correo|correos|email|e-?mail|para|destinatario|nombre|nombres|apodo|name|nickname|full_?name|fecha_?nacimiento|fechanacimiento|nacimiento|birth.*|cumple.*|genero|mensaje|mensajes|message|messages|historial|contenido|content|texto|text|body|cuerpo|prompt|password|contrasena|contraseña|clave|token.*|.*_token|secret.*|authorization|cookie|cookies|set-cookie|codigo|code|otp)$/i;

// Parámetros de URL que llevan tokens: confirmación (token_hash), recuperación (code, token), sesiones.
const PARAMETROS_SENSIBLES =
  /^(token|token_hash|code|access_token|refresh_token|provider_token|otp|clave|password|secret|email|correo|apikey|api_key|key)$/i;

// Un correo completo. La máscara del registro de correos ("d•••••7@gmail.com") se respeta: no es un correo
// completo y es lo único que identifica al destinatario en los avisos.
const CORREO = /(?<![\w.+•-])[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
// Fechas (las de nacimiento tienen esta forma); los instantes de Sentry son números, no texto.
const FECHA = /\b\d{4}-\d{2}-\d{2}\b/g;
// JWT y cadenas largas de aspecto aleatorio (tokens de enlaces). Los UUID (ids internos) se conservan.
const JWT = /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g;
const TOKEN_LARGO =
  /\b(?![0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b)[A-Za-z0-9_-]{32,}\b/g;
// Tokens en la ruta: /autorizar/<token>.
const RUTA_CON_TOKEN = /(\/autorizar\/)[^/?#\s"']+/gi;
// Parámetros sensibles en una URL o en un fragmento (#access_token=…).
const PARAMETRO_EN_TEXTO =
  /([?&#](?:token|token_hash|code|access_token|refresh_token|provider_token|otp|email|correo|apikey|api_key|key)=)[^&#\s"']*/gi;
// Detalle de Postgres con valores de la fila: «Key (nombre)=(Ana) already exists».
const DETALLE_POSTGRES = /(\([^()]*\)=\()[^()]*(\))/g;

export function limpiarTexto(texto: string): string {
  return texto
    .replace(RUTA_CON_TOKEN, `$1${OCULTO}`)
    .replace(PARAMETRO_EN_TEXTO, `$1${OCULTO}`)
    .replace(JWT, OCULTO)
    .replace(CORREO, OCULTO)
    .replace(FECHA, OCULTO)
    .replace(DETALLE_POSTGRES, `$1${OCULTO}$2`)
    .replace(TOKEN_LARGO, OCULTO);
}

// URL o ruta: oculta los parámetros sensibles y el token de /autorizar, y aplica el resto del filtro.
export function limpiarUrl(url: string): string {
  return limpiarTexto(url);
}

// Cadena de consulta suelta ("token_hash=abc&type=signup") o en forma de pares.
function limpiarConsulta(consulta: unknown): unknown {
  if (typeof consulta === 'string') {
    return consulta
      .split('&')
      .map((par) => {
        const [clave = '', ...resto] = par.split('=');
        return resto.length && PARAMETROS_SENSIBLES.test(clave)
          ? `${clave}=${OCULTO}`
          : limpiarTexto(par);
      })
      .join('&');
  }
  if (Array.isArray(consulta)) {
    return consulta.map((par) =>
      Array.isArray(par) && typeof par[0] === 'string' && PARAMETROS_SENSIBLES.test(par[0])
        ? [par[0], OCULTO]
        : limpiarValor(par),
    );
  }
  return limpiarValor(consulta);
}

// Recorre un valor cualquiera: oculta lo que va bajo una clave sensible y limpia todo el texto.
export function limpiarValor(valor: unknown, profundidad = 0): unknown {
  if (typeof valor === 'string') return limpiarTexto(valor);
  if (valor === null || typeof valor !== 'object') return valor;
  if (profundidad > 8) return OCULTO;
  if (Array.isArray(valor)) return valor.map((elemento) => limpiarValor(elemento, profundidad + 1));
  const limpio: Record<string, unknown> = {};
  for (const [clave, contenido] of Object.entries(valor)) {
    limpio[clave] = CLAVES_SENSIBLES.test(clave)
      ? OCULTO
      : limpiarValor(contenido, profundidad + 1);
  }
  return limpio;
}

// Solo el id interno (UUID) identifica a la persona: nunca el correo, el nombre ni la IP.
function limpiarUsuario(usuario: unknown): { id: string } | undefined {
  const id = (usuario as { id?: unknown } | undefined)?.id;
  return typeof id === 'string' && id ? { id } : undefined;
}

// Cabeceras que sí sirven para diagnosticar y no identifican a nadie.
const CABECERAS_PERMITIDAS = new Set([
  'content-type',
  'content-length',
  'accept',
  'user-agent',
  'x-vercel-id',
]);

type Objeto = Record<string, unknown>;
const esObjeto = (valor: unknown): valor is Objeto =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

function limpiarSolicitud(solicitud: Objeto): Objeto {
  // Nunca el cuerpo (formularios, mensajes a CHRONO), las cookies ni el entorno.
  const { headers, url, query_string, ...resto } = solicitud;
  delete resto.data;
  delete resto.cookies;
  delete resto.env;
  const limpia: Objeto = { ...(limpiarValor(resto) as Objeto) };
  if (typeof url === 'string') limpia.url = limpiarUrl(url);
  if (query_string !== undefined) limpia.query_string = limpiarConsulta(query_string);
  if (esObjeto(headers)) {
    limpia.headers = Object.fromEntries(
      Object.entries(headers)
        .filter(([nombre]) => CABECERAS_PERMITIDAS.has(nombre.toLowerCase()))
        .map(([nombre, contenido]) => [
          nombre,
          typeof contenido === 'string' ? limpiarTexto(contenido) : contenido,
        ]),
    );
  }
  return limpia;
}

// Migas de pan (lo que pasó antes del error): navegación, fetch, consola. Se conserva el tipo y se limpian el
// mensaje y los datos (las URL de fetch y navegación pierden sus tokens).
export function limpiarMigaja<T extends object>(migaja: T): T {
  const copia: Objeto = { ...(migaja as Objeto) };
  // Lo que se escribe en la consola es texto libre: un nombre o un apodo no se pueden reconocer, así que de
  // esas migas solo queda que hubo un mensaje (y su nivel).
  if (copia.category === 'console') {
    if (copia.message !== undefined) copia.message = OCULTO;
    delete copia.data;
    return copia as T;
  }
  if (typeof copia.message === 'string') copia.message = limpiarTexto(copia.message);
  if (esObjeto(copia.data)) copia.data = limpiarValor(copia.data);
  return copia as T;
}

// Evento completo (error, aviso o transacción). Devuelve una copia limpia.
export function limpiarEvento<T extends object>(evento: T): T {
  const copia: Objeto = { ...(evento as Objeto) };

  if (typeof copia.message === 'string') copia.message = limpiarTexto(copia.message);
  if (esObjeto(copia.logentry)) {
    const { message, params } = copia.logentry;
    copia.logentry = {
      ...(typeof message === 'string' ? { message: limpiarTexto(message) } : {}),
      ...(Array.isArray(params) ? { params: params.map(() => OCULTO) } : {}),
    };
  }
  if (typeof copia.transaction === 'string') copia.transaction = limpiarUrl(copia.transaction);

  const excepciones = (copia.exception as { values?: unknown } | undefined)?.values;
  if (Array.isArray(excepciones)) {
    copia.exception = {
      ...(copia.exception as Objeto),
      values: excepciones.map((excepcion) => {
        if (!esObjeto(excepcion)) return excepcion;
        const limpia: Objeto = { ...excepcion };
        if (typeof limpia.value === 'string') limpia.value = limpiarTexto(limpia.value);
        const marcos = (limpia.stacktrace as { frames?: unknown } | undefined)?.frames;
        if (Array.isArray(marcos)) {
          limpia.stacktrace = {
            ...(limpia.stacktrace as Objeto),
            frames: marcos.map((marco) =>
              esObjeto(marco) && marco.vars !== undefined
                ? { ...marco, vars: limpiarValor(marco.vars) }
                : marco,
            ),
          };
        }
        return limpia;
      }),
    };
  }

  if (Array.isArray(copia.breadcrumbs)) {
    copia.breadcrumbs = copia.breadcrumbs.map((migaja) =>
      esObjeto(migaja) ? limpiarMigaja(migaja) : migaja,
    );
  }
  if (esObjeto(copia.request)) copia.request = limpiarSolicitud(copia.request);

  const usuario = limpiarUsuario(copia.user);
  if (usuario) copia.user = usuario;
  else delete copia.user;

  for (const campo of ['extra', 'tags']) {
    if (esObjeto(copia[campo])) copia[campo] = limpiarValor(copia[campo]);
  }
  // Los contextos son técnicos (sistema, navegador, traza); solo se limpia el texto, sin borrar claves como
  // "name" (nombre del sistema operativo o del navegador).
  if (esObjeto(copia.contexts)) {
    copia.contexts = Object.fromEntries(
      Object.entries(copia.contexts).map(([nombre, contexto]) => [
        nombre,
        limpiarTextoProfundo(contexto),
      ]),
    );
  }
  if (Array.isArray(copia.spans)) {
    copia.spans = copia.spans.map((tramo) => {
      if (!esObjeto(tramo)) return tramo;
      const limpio: Objeto = { ...tramo };
      if (typeof limpio.description === 'string')
        limpio.description = limpiarTexto(limpio.description);
      if (esObjeto(limpio.data)) limpio.data = limpiarValor(limpio.data);
      return limpio;
    });
  }
  return copia as T;
}

function limpiarTextoProfundo(valor: unknown, profundidad = 0): unknown {
  if (typeof valor === 'string') return limpiarTexto(valor);
  if (valor === null || typeof valor !== 'object' || profundidad > 8) return valor;
  if (Array.isArray(valor))
    return valor.map((elemento) => limpiarTextoProfundo(elemento, profundidad + 1));
  return Object.fromEntries(
    Object.entries(valor).map(([clave, contenido]) => [
      clave,
      limpiarTextoProfundo(contenido, profundidad + 1),
    ]),
  );
}

// ---------- Cuándo y cómo se activa ----------

export const MUESTREO_POR_DEFECTO = 0.05;

// Solo en producción o en vistas previas de Vercel, y solo con un DSN. En desarrollo y en las pruebas, nunca.
export function sentryActivo(entorno: {
  dsn?: string | undefined;
  vercelEnv?: string | undefined;
  nodeEnv?: string | undefined;
}): boolean {
  if (!entorno.dsn?.trim()) return false;
  if (entorno.nodeEnv === 'test') return false;
  return entorno.vercelEnv === 'production' || entorno.vercelEnv === 'preview';
}

// Fracción de transacciones que se miden: SENTRY_TRACES_SAMPLE_RATE (0 a 0,1), por defecto 0,05. Un valor
// mayor que 0,1 se recorta a 0,1 para no gastar la cuota gratuita ni enviar más de lo necesario.
export function muestreoDeTrazas(valor: string | undefined): number {
  const numero = Number.parseFloat((valor ?? '').replace(',', '.'));
  if (!Number.isFinite(numero) || numero < 0) return MUESTREO_POR_DEFECTO;
  return Math.min(numero, 0.1);
}
