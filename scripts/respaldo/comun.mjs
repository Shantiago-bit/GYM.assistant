// Utilidades compartidas por respaldar.mjs y restaurar.mjs. Las funciones puras de arriba tienen pruebas en
// tests/scripts/respaldo.test.ts. Nada de aquí imprime URLs, claves ni contenido del respaldo.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createGunzip } from 'node:zlib';

// Marcas que la prueba de humo busca en el respaldo descifrado: las tablas principales y las cuentas.
export const MARCAS_REQUERIDAS = [
  'CREATE TABLE public.ejercicios ',
  'CREATE TABLE public.sesiones ',
  'CREATE TABLE public.series ',
  'CREATE TABLE public.perfiles ',
  'COPY public.ejercicios ',
  'COPY auth.users ',
  'COPY auth.identities ',
];

// Tamaño mínimo razonable del archivo cifrado: un respaldo vacío o cortado pesa menos.
export const TAMANO_MINIMO_BYTES = 4 * 1024;

// Quita de un texto cualquier URL de Postgres y contraseña, para poder mostrar errores sin filtrar secretos.
export function ocultarSecretos(texto, secretos = []) {
  let limpio = String(texto ?? '').replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, '[url oculta]');
  for (const secreto of secretos) {
    if (secreto && secreto.length >= 4) limpio = limpio.split(secreto).join('[oculto]');
  }
  // Un error de Postgres puede citar valores de una fila (por ejemplo, un correo): también se ocultan.
  return limpio.replace(/password=\S+/gi, 'password=[oculta]').replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[correo oculto]');
}

// Datos de conexión de una URL de Postgres como variables PG* (así la URL nunca va en los argumentos).
export function variablesDeConexion(urlTexto, certificado) {
  const url = new URL(urlTexto);
  const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname);
  return {
    PGHOST: url.hostname.replace(/^\[|\]$/g, ''),
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, '')) || 'postgres',
    // Supabase firma con una CA propia (supabase/ca.crt): se verifica el certificado y el nombre del servidor.
    ...(local ? { PGSSLMODE: 'disable' } : { PGSSLMODE: 'verify-full', PGSSLROOTCERT: certificado }),
  };
}

// pg_dump necesita una conexión con sesión propia: la directa o el pooler en modo sesión (5432). El modo
// transacción (6543) no sirve.
export function revisarPuerto(urlTexto) {
  const puerto = new URL(urlTexto).port || '5432';
  if (puerto === '6543') {
    throw new Error(
      'La URL usa el pooler en modo transacción (puerto 6543). pg_dump necesita la conexión directa o el pooler en modo sesión (puerto 5432).',
    );
  }
}

// Referencia del proyecto de Supabase en una URL: el usuario del pooler ("postgres.<ref>"), el host directo
// ("db.<ref>.supabase.co") o la URL de la API ("https://<ref>.supabase.co").
export function referenciaDeProyecto(urlTexto) {
  if (!urlTexto) return null;
  try {
    const url = new URL(urlTexto);
    const usuario = decodeURIComponent(url.username);
    const delUsuario = /^[^.]+\.([a-z0-9]{15,})$/.exec(usuario)?.[1];
    if (delUsuario) return delUsuario;
    const delHost = /^(?:db\.)?([a-z0-9]{15,})\.supabase\.(?:co|com)$/.exec(url.hostname)?.[1];
    return delHost ?? null;
  } catch {
    return null;
  }
}

// ¿La URL de destino es la base de producción? Compara la referencia del proyecto (o el host y la base, si no
// es de Supabase) con las URLs de producción conocidas.
export function esProduccion(destino, urlsProduccion) {
  const refDestino = referenciaDeProyecto(destino);
  for (const produccion of urlsProduccion.filter(Boolean)) {
    const refProduccion = referenciaDeProyecto(produccion);
    if (refDestino && refProduccion && refDestino === refProduccion) return true;
    try {
      const a = new URL(destino);
      const b = new URL(produccion);
      if (a.hostname === b.hostname && a.port === b.port && a.pathname === b.pathname && a.username === b.username) return true;
    } catch {
      // Una URL inválida no es producción; el error de conexión aparece después.
    }
  }
  return false;
}

// Nombre del archivo con la fecha de Bogotá: respaldo-AAAA-MM-DD.sql.gz.gpg.
export function nombreDeRespaldo(fecha = new Date()) {
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha);
  return `respaldo-${dia}.sql.gz.gpg`;
}

// Versión mayor a partir de server_version_num (170011 → 17) o de "pg_dump (PostgreSQL) 17.11".
export function versionMayor(texto) {
  const valor = String(texto).trim();
  if (/^\d{5,6}$/.test(valor)) return Math.floor(Number(valor) / 10000);
  const coincidencia = /(\d+)(?:\.\d+)+/.exec(valor);
  return coincidencia ? Number(coincidencia[1]) : null;
}

// Convierte una definición de disparador en idempotente.
export function disparadorIdempotente(definicion) {
  return `${definicion.trim().replace(/^CREATE TRIGGER /, 'CREATE OR REPLACE TRIGGER ').replace(/;?$/, ';')}`;
}

// Busca las marcas en un flujo de texto sin guardarlo entero (se revisa por trozos con solapamiento).
export function crearBuscadorDeMarcas(marcas = MARCAS_REQUERIDAS) {
  const pendientes = new Set(marcas);
  const solape = Math.max(...marcas.map((marca) => marca.length));
  let cola = '';
  return {
    revisar(trozo) {
      const texto = cola + trozo;
      for (const marca of [...pendientes]) if (texto.includes(marca)) pendientes.delete(marca);
      cola = texto.slice(-solape);
    },
    faltantes: () => [...pendientes],
  };
}

// ---------- Procesos ----------

// Binario de Postgres: de PG_BIN (carpeta) si está definida; si no, el del PATH.
export function binario(nombre) {
  const extension = process.platform === 'win32' ? '.exe' : '';
  return process.env.PG_BIN ? path.join(process.env.PG_BIN, `${nombre}${extension}`) : nombre;
}

// gpg: GPG_BIN si está definida; en Windows, el que trae Git for Windows; si no, el del PATH.
const GPG_DE_GIT = 'C:\\Program Files\\Git\\usr\\bin\\gpg.exe';
export function binarioGpg() {
  if (process.env.GPG_BIN) return process.env.GPG_BIN;
  if (process.platform === 'win32' && existsSync(GPG_DE_GIT)) return GPG_DE_GIT;
  return 'gpg';
}

// Lanza un proceso; stderr se guarda (sin mostrarlo) para dar un error limpio si falla.
export function lanzar(comando, argumentos, { env = {}, stdio = ['ignore', 'pipe', 'pipe'], secretos = [] } = {}) {
  const hijo = spawn(comando, argumentos, { env: { ...process.env, ...env }, stdio, windowsHide: true });
  let errores = '';
  hijo.stderr?.on('data', (dato) => {
    errores = (errores + dato.toString()).slice(-4000);
  });
  const terminado = new Promise((resolver, rechazar) => {
    hijo.on('error', (error) =>
      rechazar(new Error(`No se pudo ejecutar ${path.basename(comando)}: ${error.code === 'ENOENT' ? 'no está instalado o no está en el PATH' : error.message}`)),
    );
    hijo.on('close', (codigo) =>
      codigo === 0
        ? resolver()
        : rechazar(new Error(`${path.basename(comando)} terminó con el código ${codigo}: ${ocultarSecretos(errores.trim().split('\n').slice(-3).join(' | '), secretos)}`)),
    );
  });
  return { hijo, terminado };
}

// Ejecuta un comando y devuelve su salida estándar como texto.
export async function salidaDe(comando, argumentos, opciones = {}) {
  const { hijo, terminado } = lanzar(comando, argumentos, opciones);
  let salida = '';
  hijo.stdout.on('data', (dato) => {
    salida += dato.toString();
  });
  await terminado;
  return salida;
}

// Escribe la clave en un archivo temporal privado para gpg (--passphrase-file) y lo borra al terminar: así la
// clave no aparece en los argumentos de ningún proceso ni en los registros.
export async function conArchivoDeClave(clave, accion) {
  const carpeta = mkdtempSync(path.join(tmpdir(), 'respaldo-'));
  const archivo = path.join(carpeta, 'clave');
  try {
    writeFileSync(archivo, clave, { mode: 0o600 });
    return await accion(archivo);
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
}

// Argumentos comunes de gpg en modo no interactivo con la clave en un archivo.
export function argumentosGpg(archivoClave) {
  return ['--batch', '--yes', '--quiet', '--no-tty', '--pinentry-mode', 'loopback', '--passphrase-file', archivoClave];
}

// Abre una transacción de solo lectura que exporta su instantánea y la deja abierta hasta `cerrar()`. Cada
// pg_dump con --snapshot=<instantanea> ve exactamente la misma foto de la base, así las cuentas (auth) y los
// datos de public salen coherentes aunque alguien se registre o borre su cuenta durante el respaldo.
// El identificador sale por \warn (stderr no tiene búfer), mientras la sesión de psql sigue abierta.
export async function abrirInstantanea(
  conexion,
  secretos = [],
  { comando = binario('psql'), argumentos = ['-X', '--no-password', '--quiet', '-v', 'ON_ERROR_STOP=1'], espera = 30_000 } = {},
) {
  const { hijo, terminado } = lanzar(comando, argumentos, {
    env: conexion,
    stdio: ['pipe', 'ignore', 'pipe'],
    secretos,
  });
  terminado.catch(() => undefined); // el error se informa abajo o en cerrar()
  hijo.stdin.on('error', () => undefined);
  const instantanea = await new Promise((resolver, rechazar) => {
    let visto = '';
    const plazo = setTimeout(() => rechazar(new Error('psql no devolvió la instantánea a tiempo.')), espera);
    hijo.stderr.on('data', (dato) => {
      visto += dato.toString();
      const coincidencia = /INSTANTANEA=([0-9A-Fa-f-]+)/.exec(visto);
      if (coincidencia) {
        clearTimeout(plazo);
        resolver(coincidencia[1]);
      }
    });
    terminado.then(
      () => rechazar(new Error('psql terminó sin devolver la instantánea.')),
      (error) => {
        clearTimeout(plazo);
        rechazar(error);
      },
    );
    hijo.stdin.write(
      'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\n' +
        'SELECT pg_export_snapshot() AS instantanea \\gset\n' +
        '\\warn INSTANTANEA=:instantanea\n',
    );
  }).catch((error) => {
    hijo.kill();
    throw error;
  });
  return {
    instantanea,
    cerrar: async () => {
      hijo.stdin.end('COMMIT;\n');
      await terminado;
    },
  };
}

// Carga en psql el SQL que llega por `entrada` dentro de una transacción que abre y cierra este código:
// COMMIT solo se envía cuando `entrada` terminó bien y `origenTerminado` (gpg) se cumplió. Si algo falla antes
// (clave equivocada, archivo cortado, gzip dañado, error de SQL), psql se corta y el servidor deshace todo.
// Con --single-transaction no basta: si la entrada se corta a medias, psql la toma como fin de archivo y hace
// COMMIT de lo que alcanzó a leer.
export async function cargarEnTransaccion({ entrada, origenTerminado, psql }) {
  const { hijo, terminado } = psql;
  hijo.stdin.on('error', () => undefined); // si psql se detiene, su error llega por `terminado`
  terminado.catch(() => undefined);
  hijo.stdin.write('BEGIN;\n');
  entrada.pipe(hijo.stdin, { end: false });
  const entradaCompleta = new Promise((resolver, rechazar) => {
    entrada.on('end', resolver);
    entrada.on('error', rechazar);
  });
  let fallaDePsql = false;
  const psqlSeDetuvo = terminado.then(
    () => {
      fallaDePsql = true;
      throw new Error('psql terminó antes de recibir todo el respaldo.');
    },
    (error) => {
      fallaDePsql = true;
      throw error;
    },
  );
  psqlSeDetuvo.catch(() => undefined);
  try {
    await Promise.race([Promise.all([origenTerminado, entradaCompleta]), psqlSeDetuvo]);
  } catch (error) {
    hijo.kill();
    entrada.unpipe(hijo.stdin);
    entrada.resume(); // que el origen termine de escribir y no se quede esperando
    // Si psql se detuvo (por ejemplo, un error de SQL), ese es el error: no hace falta esperar al origen.
    if (fallaDePsql) throw error;
    // Si falló la entrada, el error útil suele ser el del origen (gpg: por ejemplo, "Bad session key").
    const falloDelOrigen = await Promise.resolve(origenTerminado).then(
      () => null,
      (fallo) => fallo,
    );
    throw falloDelOrigen ?? error;
  }
  // El salto de línea inicial evita que COMMIT quede dentro de un comentario si el SQL no termina en "\n".
  hijo.stdin.end('\nCOMMIT;\n');
  await terminado;
}

// Descifra y descomprime un respaldo en memoria, entregando el texto por trozos a `alTrozo`. Nada se escribe
// en el disco.
export async function leerRespaldo(archivo, clave, alTrozo) {
  await conArchivoDeClave(clave, async (archivoClave) => {
    const { hijo, terminado } = lanzar(binarioGpg(), [...argumentosGpg(archivoClave), '--decrypt', archivo], { secretos: [clave] });
    const gunzip = createGunzip();
    gunzip.setEncoding('utf8');
    gunzip.on('data', alTrozo);
    const descomprimido = new Promise((resolver, rechazar) => {
      gunzip.on('end', resolver);
      gunzip.on('error', (error) => rechazar(new Error(`El respaldo descifrado no es un gzip válido: ${error.message}`)));
    });
    hijo.stdout.pipe(gunzip);
    await Promise.all([terminado, descomprimido]);
  });
}
