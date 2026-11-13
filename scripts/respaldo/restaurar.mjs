// Restaura un respaldo cifrado en una base de destino.
//
//   npm run db:restaurar -- <archivo.sql.gz.gpg> <url-destino> [--si-es-produccion]
//
// Necesita RESPALDO_CLAVE (en .env.local) y psql de la misma versión mayor que el servidor (o la carpeta de
// binarios en PG_BIN). Se niega a restaurar sobre la base de producción salvo con --si-es-produccion.
// El SQL descifrado no toca el disco: gpg → gunzip → psql, todo en una sola transacción.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createGunzip } from 'node:zlib';
import { existsSync } from 'node:fs';
import {
  argumentosGpg,
  binario,
  binarioGpg,
  conArchivoDeClave,
  esProduccion,
  lanzar,
  ocultarSecretos,
  revisarPuerto,
  salidaDe,
  variablesDeConexion,
} from './comun.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CERTIFICADO = path.join(RAIZ, 'supabase', 'ca.crt');

// URLs que identifican la base de producción (si están en .env.local o en el entorno).
/** @param {Record<string, string | undefined>} [entorno] */
export const urlsDeProduccion = (entorno = process.env) => [
  entorno.GYMLEAD_POSTGRES_URL,
  entorno.GYMLEAD_POSTGRES_URL_NON_POOLING,
  entorno.RESPALDO_POSTGRES_URL,
  entorno.NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_URL,
];

async function principal() {
  const argumentos = process.argv.slice(2);
  const confirmado = argumentos.includes('--si-es-produccion');
  const [archivo, destino] = argumentos.filter((argumento) => argumento !== '--si-es-produccion');
  const clave = process.env.RESPALDO_CLAVE ?? '';

  if (!archivo || !destino) throw new Error('Uso: npm run db:restaurar -- <archivo.sql.gz.gpg> <url-destino> [--si-es-produccion]');
  if (!existsSync(archivo)) throw new Error(`No existe el archivo ${archivo}.`);
  if (!clave) throw new Error('Falta RESPALDO_CLAVE en .env.local: es la misma clave con que se cifró el respaldo.');
  revisarPuerto(destino);

  if (esProduccion(destino, urlsDeProduccion()) && !confirmado) {
    throw new Error(
      'La URL de destino es la base de PRODUCCIÓN. Restaurar ahí reemplaza datos reales. Si de verdad es lo que quieres (por ejemplo, tras perder la base), repite el comando con --si-es-produccion.',
    );
  }

  const conexion = variablesDeConexion(destino, CERTIFICADO);
  const secretos = [clave, conexion.PGPASSWORD];
  const psql = ['-X', '--no-password', '-v', 'ON_ERROR_STOP=1'];
  const version = (await salidaDe(binario('psql'), [...psql, '-A', '-t', '-c', 'SHOW server_version'], { env: conexion, secretos })).trim();
  console.log(`Restaurando ${path.basename(archivo)} en Postgres ${version.split(' ')[0]} (una sola transacción)…`);

  await conArchivoDeClave(clave, async (archivoClave) => {
    const gpg = lanzar(binarioGpg(), [...argumentosGpg(archivoClave), '--decrypt', archivo], { secretos });
    // psql: la salida normal (SET, COPY n…) se descarta; los errores se muestran resumidos y sin datos.
    const restauracion = lanzar(binario('psql'), [...psql, '--quiet', '--single-transaction', '-f', '-'], {
      env: conexion,
      stdio: ['pipe', 'ignore', 'pipe'],
      secretos,
    });
    restauracion.hijo.stdin.on('error', () => undefined);
    const gunzip = createGunzip();
    gunzip.on('error', () => restauracion.hijo.stdin.destroy());
    gpg.hijo.stdout.pipe(gunzip).pipe(restauracion.hijo.stdin);
    await Promise.all([gpg.terminado, restauracion.terminado]);
  });

  // Resumen: solo conteos.
  const conteos = await salidaDe(
    binario('psql'),
    [
      ...psql,
      '-A',
      '-t',
      '-F',
      ' ',
      '-c',
      `SELECT (SELECT count(*) FROM auth.users), (SELECT count(*) FROM public.perfiles), (SELECT count(*) FROM public.ejercicios),
              (SELECT count(*) FROM public.sesiones), (SELECT count(*) FROM public.series)`,
    ],
    { env: conexion, secretos },
  );
  const [cuentas, perfiles, ejercicios, sesiones, series] = conteos.trim().split(' ');
  console.log(`Listo: ${cuentas} cuentas, ${perfiles} perfiles, ${ejercicios} ejercicios, ${sesiones} sesiones y ${series} series.`);
  console.log('Siguiente paso: VERIFICAR_BD_URL="<url-destino>" npm run db:verificar (ver Doc/RESPALDOS.md).');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  principal().catch((error) => {
    console.error(`Error: ${ocultarSecretos(error.message, [process.env.RESPALDO_CLAVE])}`);
    process.exitCode = 1;
  });
}
