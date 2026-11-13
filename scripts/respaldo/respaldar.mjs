// Respaldo cifrado de la base de datos. Lo usan el workflow .github/workflows/respaldo.yml y `npm run db:respaldar`.
//
//   node scripts/respaldo/respaldar.mjs [--salida <carpeta>]      (por defecto, respaldos/)
//
// Variables: RESPALDO_POSTGRES_URL (en local, si falta, GYMLEAD_POSTGRES_URL_NON_POOLING) y RESPALDO_CLAVE.
// Qué contiene y por qué: Doc/RESPALDOS.md. El SQL sin cifrar nunca toca el disco: pg_dump → gzip → gpg.
import { createReadStream, existsSync, mkdirSync, rmSync, statSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { Transform } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createGzip } from 'node:zlib';
import {
  MARCAS_REQUERIDAS,
  TAMANO_MINIMO_BYTES,
  argumentosGpg,
  binario,
  binarioGpg,
  conArchivoDeClave,
  crearBuscadorDeMarcas,
  disparadorIdempotente,
  lanzar,
  leerRespaldo,
  nombreDeRespaldo,
  ocultarSecretos,
  revisarPuerto,
  salidaDe,
  variablesDeConexion,
  versionMayor,
} from './comun.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CERTIFICADO = path.join(RAIZ, 'supabase', 'ca.crt');
export const LARGO_MINIMO_CLAVE = 24;

// En el esquema public, "CREATE SCHEMA public;" fallaría en un proyecto nuevo (ya existe): se vuelve idempotente.
function hacerEsquemaIdempotente() {
  let resto = '';
  const transformar = (linea) => (linea === 'CREATE SCHEMA public;' ? 'CREATE SCHEMA IF NOT EXISTS public;' : linea);
  return new Transform({
    transform(trozo, _codificacion, listo) {
      const lineas = (resto + trozo.toString('utf8')).split('\n');
      resto = lineas.pop() ?? '';
      listo(null, lineas.map((linea) => `${transformar(linea)}\n`).join(''));
    },
    flush(listo) {
      listo(null, resto ? transformar(resto) : '');
    },
  });
}

/**
 * @typedef {{ escribir: (texto: string) => Promise<void>, canalizar: (flujo: import('node:stream').Readable) => Promise<void> }} Salida
 * @typedef {(salida: Salida) => Promise<void>} Fuente
 */

// Comprime y cifra lo que escriben las fuentes, en orden, directo al archivo .gpg.
/** @param {{ fuentes: Fuente[], archivo: string, clave: string }} opciones */
export async function generarRespaldo({ fuentes, archivo, clave }) {
  mkdirSync(path.dirname(archivo), { recursive: true });
  try {
    await conArchivoDeClave(clave, async (archivoClave) => {
      const { hijo: gpg, terminado } = lanzar(
        binarioGpg(),
        [...argumentosGpg(archivoClave), '--symmetric', '--cipher-algo', 'AES256', '--compress-algo', 'none', '--output', archivo],
        { stdio: ['pipe', 'ignore', 'pipe'], secretos: [clave] },
      );
      // Si gpg falla, el error llega por `terminado`; esto solo evita que la escritura rota tumbe el proceso.
      gpg.stdin.on('error', () => undefined);
      const gzip = createGzip({ level: 9 });
      gzip.pipe(gpg.stdin);
      const escribir = (texto) =>
        new Promise((resolver) => (gzip.write(texto) ? resolver() : gzip.once('drain', resolver)));
      const canalizar = (flujo) =>
        new Promise((resolver, rechazar) => {
          flujo.on('error', rechazar);
          flujo.on('end', resolver);
          flujo.pipe(gzip, { end: false });
        });
      for (const fuente of fuentes) await fuente({ escribir, canalizar });
      gzip.end();
      await terminado;
    });
  } catch (error) {
    rmSync(archivo, { force: true });
    throw error;
  }
}

// Prueba de humo: el archivo pesa lo suficiente, no está en claro, no se abre con otra clave y, descifrado en
// memoria, contiene las tablas principales y las cuentas.
export async function verificarRespaldo({ archivo, clave, marcas = MARCAS_REQUERIDAS, tamanoMinimo = TAMANO_MINIMO_BYTES }) {
  const tamano = statSync(archivo).size;
  if (tamano < tamanoMinimo) throw new Error(`El respaldo pesa ${tamano} bytes: es demasiado pequeño.`);

  const inicio = await new Promise((resolver, rechazar) => {
    const partes = [];
    createReadStream(archivo, { start: 0, end: 65535 })
      .on('data', (parte) => partes.push(parte))
      .on('end', () => resolver(Buffer.concat(partes)))
      .on('error', rechazar);
  });
  if (inicio[0] === 0x1f && inicio[1] === 0x8b) throw new Error('El archivo es un gzip sin cifrar.');
  if (/CREATE TABLE|COPY |INSERT INTO/.test(inicio.toString('latin1'))) throw new Error('El archivo contiene SQL en claro.');

  const conOtraClave = await leerRespaldo(archivo, `${clave}-incorrecta`, () => undefined).then(
    () => true,
    () => false,
  );
  if (conOtraClave) throw new Error('El respaldo se pudo abrir con una clave incorrecta.');

  const buscador = crearBuscadorDeMarcas(marcas);
  await leerRespaldo(archivo, clave, (trozo) => buscador.revisar(trozo));
  const faltantes = buscador.faltantes();
  if (faltantes.length > 0) throw new Error(`Al respaldo le faltan: ${faltantes.map((marca) => marca.trim()).join(', ')}.`);
  return { tamano, marcas: marcas.length };
}

// Fuentes reales: pg_dump y psql con los datos de conexión en variables PG* (la URL nunca va en los argumentos).
function fuentesDePostgres(conexion, secretos, disparadores) {
  const pgDump = (argumentos) =>
    async ({ canalizar }) => {
      const { hijo, terminado } = lanzar(binario('pg_dump'), ['--no-password', ...argumentos], { env: conexion, secretos });
      await Promise.all([canalizar(hijo.stdout.pipe(hacerEsquemaIdempotente())), terminado]);
    };
  const fecha = new Date().toISOString();
  return [
    async ({ escribir }) =>
      escribir(
        `-- Respaldo de Gym Assistant (${fecha}). Restaurar con: npm run db:restaurar -- <archivo> <url-destino>\n` +
          '-- Orden: 1) datos de auth.users y auth.identities, 2) esquema y datos de public, 3) disparadores de\n' +
          '-- auth.users que llaman a funciones de public. Ver Doc/RESPALDOS.md.\n' +
          "-- Como recomienda Supabase, los datos se cargan sin disparadores ni reglas de réplica.\n" +
          'SET session_replication_role = replica;\n\n',
      ),
    // 1) Cuentas: solo los datos (el esquema auth lo crea y lo actualiza Supabase).
    pgDump(['--data-only', '--table=auth.users', '--table=auth.identities']),
    // 2) Todo el esquema public: tablas, funciones, índices, restricciones, RLS, permisos y datos.
    pgDump(['--schema=public', '--no-owner', '--no-publications', '--no-subscriptions']),
    // 3) Disparadores sobre auth.users que llaman a public (por ejemplo, on_auth_user_created): pg_dump del
    //    esquema public no los incluye porque la tabla es de auth.
    async ({ escribir }) =>
      escribir(
        '\nRESET session_replication_role;\n\n-- Disparadores de auth que llaman a funciones de public.\n' +
          disparadores.map((definicion) => `${disparadorIdempotente(definicion)}\n`).join('') +
          '\n-- Fin del respaldo.\n',
      ),
  ];
}

async function principal() {
  const argumentos = process.argv.slice(2);
  const indiceSalida = argumentos.indexOf('--salida');
  const carpeta = path.resolve(indiceSalida >= 0 ? argumentos[indiceSalida + 1] : path.join(RAIZ, 'respaldos'));
  const url = process.env.RESPALDO_POSTGRES_URL || process.env.GYMLEAD_POSTGRES_URL_NON_POOLING;
  const clave = process.env.RESPALDO_CLAVE ?? '';

  if (!url) throw new Error('Falta RESPALDO_POSTGRES_URL (o GYMLEAD_POSTGRES_URL_NON_POOLING en .env.local).');
  if (clave.length < LARGO_MINIMO_CLAVE)
    throw new Error(`Falta RESPALDO_CLAVE o es muy corta (mínimo ${LARGO_MINIMO_CLAVE} caracteres). Ver Doc/RESPALDOS.md.`);
  revisarPuerto(url);

  const conexion = variablesDeConexion(url, CERTIFICADO);
  const secretos = [clave, conexion.PGPASSWORD];

  // pg_dump debe ser de la misma versión mayor que el servidor.
  const psql = ['-X', '--no-password', '-A', '-t', '-v', 'ON_ERROR_STOP=1'];
  const servidor = versionMayor(await salidaDe(binario('psql'), [...psql, '-c', 'SHOW server_version_num'], { env: conexion, secretos }));
  const cliente = versionMayor(await salidaDe(binario('pg_dump'), ['--version']));
  if (!servidor || servidor !== cliente)
    throw new Error(`pg_dump es de la versión ${cliente} y el servidor de la ${servidor}: instala el cliente de Postgres ${servidor}.`);

  // Disparadores de auth que llaman a funciones de public, con los nombres completos (search_path vacío).
  const consulta = `SELECT pg_get_triggerdef(t.oid) FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid JOIN pg_namespace np ON np.oid = p.pronamespace
    WHERE n.nspname = 'auth' AND np.nspname = 'public' AND NOT t.tgisinternal ORDER BY t.tgname`;
  const disparadores = (
    await salidaDe(binario('psql'), [...psql, '-c', 'BEGIN READ ONLY', '-c', "SELECT set_config('search_path', '', true)", '-c', consulta, '-c', 'COMMIT'], {
      env: conexion,
      secretos,
    })
  )
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea.startsWith('CREATE TRIGGER '));

  const archivo = path.join(carpeta, nombreDeRespaldo());
  console.log(`Postgres ${servidor}: generando ${path.basename(archivo)} (cifrado con AES-256)…`);
  await generarRespaldo({ fuentes: fuentesDePostgres(conexion, secretos, disparadores), archivo, clave });
  const { tamano, marcas } = await verificarRespaldo({ archivo, clave });
  console.log(`Listo: ${path.basename(archivo)}, ${(tamano / 1024).toFixed(1)} KB. Prueba de humo: ${marcas} marcas encontradas, ${disparadores.length} disparador(es) de auth, no se abre con otra clave.`);

  if (process.env.GITHUB_OUTPUT && existsSync(archivo)) {
    appendFileSync(process.env.GITHUB_OUTPUT, `archivo=${archivo}\nnombre=${path.basename(archivo, '.sql.gz.gpg')}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal().catch((error) => {
    console.error(`Error: ${ocultarSecretos(error.message, [process.env.RESPALDO_CLAVE])}`);
    process.exitCode = 1;
  });
}
