// @vitest-environment node
import { spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import { createGunzip, gzipSync } from 'node:zlib';
import { afterAll, describe, expect, it } from 'vitest';
import {
  MARCAS_REQUERIDAS,
  abrirInstantanea,
  binarioGpg,
  cargarEnTransaccion,
  crearBuscadorDeMarcas,
  disparadorIdempotente,
  esProduccion,
  lanzar,
  leerRespaldo,
  nombreDeRespaldo,
  ocultarSecretos,
  referenciaDeProyecto,
  revisarPuerto,
  variablesDeConexion,
  versionMayor,
} from '../../scripts/respaldo/comun.mjs';
import { generarRespaldo, verificarRespaldo } from '../../scripts/respaldo/respaldar.mjs';
import { urlsDeProduccion } from '../../scripts/respaldo/restaurar.mjs';

// URLs inventadas con la forma de las de Supabase (ningún dato real).
const REF = 'abcdefghijklmnopqrst';
const POOLER_SESION = `postgresql://postgres.${REF}:contrasena-falsa@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`;
const POOLER_TRANSACCION = POOLER_SESION.replace(':5432', ':6543');
const DIRECTA = `postgresql://postgres:otra-falsa@db.${REF}.supabase.co:5432/postgres`;
const OTRO_PROYECTO = 'postgresql://postgres.zyxwvutsrqponmlkjihg:x@aws-0-us-east-1.pooler.supabase.com:5432/postgres';
const LOCAL = 'postgresql://postgres:postgres@localhost:54329/restaurada';

describe('utilidades del respaldo', () => {
  it('oculta URLs, contraseñas, claves y correos en los mensajes', () => {
    const texto = `falló ${POOLER_SESION} con password=abc y la clave super-clave-larga para ana.perez@example.com`;
    const limpio = ocultarSecretos(texto, ['super-clave-larga']);
    expect(limpio).not.toContain('contrasena-falsa');
    expect(limpio).not.toContain('super-clave-larga');
    expect(limpio).not.toContain('ana.perez@example.com');
    expect(limpio).toBe('falló [url oculta] con password=[oculta] y la clave [oculto] para [correo oculto]');
  });

  it('pasa la URL a variables PG* (fuera de los argumentos) con SSL verificado, o sin SSL en local', () => {
    expect(variablesDeConexion(POOLER_SESION, '/ca.crt')).toEqual({
      PGHOST: 'aws-0-us-east-1.pooler.supabase.com',
      PGPORT: '5432',
      PGUSER: `postgres.${REF}`,
      PGPASSWORD: 'contrasena-falsa',
      PGDATABASE: 'postgres',
      PGSSLMODE: 'verify-full',
      PGSSLROOTCERT: '/ca.crt',
    });
    expect(variablesDeConexion(LOCAL, '/ca.crt')).toMatchObject({ PGHOST: 'localhost', PGPORT: '54329', PGSSLMODE: 'disable' });
  });

  it('rechaza el pooler en modo transacción (6543): pg_dump necesita el modo sesión o la conexión directa', () => {
    expect(() => revisarPuerto(POOLER_TRANSACCION)).toThrow(/puerto 6543/);
    expect(() => revisarPuerto(POOLER_SESION)).not.toThrow();
    expect(() => revisarPuerto(DIRECTA)).not.toThrow();
  });

  it('reconoce el proyecto de Supabase por el usuario del pooler, el host directo o la URL de la API', () => {
    expect(referenciaDeProyecto(POOLER_SESION)).toBe(REF);
    expect(referenciaDeProyecto(DIRECTA)).toBe(REF);
    expect(referenciaDeProyecto(`https://${REF}.supabase.co`)).toBe(REF);
    expect(referenciaDeProyecto(LOCAL)).toBeNull();
  });

  it('detecta la base de producción para no restaurar encima sin confirmación', () => {
    const produccion = urlsDeProduccion({ GYMLEAD_POSTGRES_URL: POOLER_TRANSACCION, NEXT_PUBLIC_GYMLEAD_GYMLEADSUPABASE_URL: `https://${REF}.supabase.co` });
    expect(esProduccion(DIRECTA, produccion)).toBe(true);
    expect(esProduccion(POOLER_SESION, produccion)).toBe(true);
    expect(esProduccion(OTRO_PROYECTO, produccion)).toBe(false);
    expect(esProduccion(LOCAL, produccion)).toBe(false);
    expect(esProduccion(LOCAL, [LOCAL])).toBe(true);
  });

  it('nombre con la fecha de Bogotá, versión mayor y disparadores idempotentes', () => {
    // 2026-11-13 03:00 UTC sigue siendo 12 de noviembre en Bogotá.
    expect(nombreDeRespaldo(new Date('2026-11-13T03:00:00Z'))).toBe('respaldo-2026-11-12.sql.gz.gpg');
    expect(versionMayor('170011')).toBe(17);
    expect(versionMayor('pg_dump (PostgreSQL) 17.11')).toBe(17);
    expect(disparadorIdempotente('CREATE TRIGGER t AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.f()')).toBe(
      'CREATE OR REPLACE TRIGGER t AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.f();',
    );
  });

  it('encuentra las marcas aunque queden partidas entre dos trozos', () => {
    const buscador = crearBuscadorDeMarcas(['COPY auth.users ']);
    buscador.revisar('...datos\nCOPY au');
    buscador.revisar('th.users (id, email) FROM stdin;');
    expect(buscador.faltantes()).toEqual([]);
  });
});

// psql falso dentro del mismo proceso: guarda lo que recibe, termina bien al cerrarle la entrada (como psql
// después del COMMIT) y termina con error si se le corta. cargarEnTransaccion solo usa stdin, kill y terminado.
function psqlFalso({ fallaAlVer }: { fallaAlVer?: string } = {}) {
  const stdin = new PassThrough();
  let recibido = '';
  let cortado = false;
  let terminar: (error?: Error) => void = () => undefined;
  const terminado = new Promise<void>((resolver, rechazar) => {
    terminar = (error) => (error ? rechazar(error) : resolver());
  });
  stdin.on('data', (dato: Buffer) => {
    recibido += dato.toString();
    if (fallaAlVer && recibido.includes(fallaAlVer)) terminar(new Error('psql terminó con el código 3: ERROR simulado'));
  });
  stdin.on('end', () => terminar());
  return {
    hijo: {
      stdin,
      kill: () => {
        cortado = true;
        terminar(new Error('psql terminó con el código null'));
        return true;
      },
    },
    terminado,
    recibido: () => recibido,
    cortado: () => cortado,
  };
}

describe('restaurar en una sola transacción', () => {
  it('si todo sale bien, envuelve el SQL en BEGIN y COMMIT', async () => {
    const psql = psqlFalso();
    await cargarEnTransaccion({ entrada: Readable.from(['CREATE TABLE public.a (id int);\n', 'COPY public.a (id) FROM stdin;\n']), origenTerminado: Promise.resolve(), psql });
    expect(psql.recibido()).toBe('BEGIN;\nCREATE TABLE public.a (id int);\nCOPY public.a (id) FROM stdin;\n\nCOMMIT;\n');
    expect(psql.cortado()).toBe(false);
  });

  it('un archivo cortado (gzip incompleto) corta psql sin COMMIT', async () => {
    const comprimido = gzipSync(Buffer.from('CREATE TABLE public.a (id int);\n'.repeat(2000)));
    const gunzip = createGunzip();
    Readable.from([comprimido.subarray(0, Math.floor(comprimido.length / 2))]).pipe(gunzip);
    const psql = psqlFalso();
    await expect(cargarEnTransaccion({ entrada: gunzip, origenTerminado: Promise.resolve(), psql })).rejects.toThrow();
    expect(psql.recibido()).toMatch(/^BEGIN;\n/);
    expect(psql.recibido()).not.toContain('COMMIT');
    expect(psql.cortado()).toBe(true);
  });

  it('si gpg falla, ese es el error que se informa y no hay COMMIT', async () => {
    const psql = psqlFalso();
    const origenTerminado = Promise.reject(new Error('gpg terminó con el código 2: gpg: decryption failed: Bad session key'));
    await expect(cargarEnTransaccion({ entrada: Readable.from(['-- nada\n']), origenTerminado, psql })).rejects.toThrow('Bad session key');
    expect(psql.recibido()).not.toContain('COMMIT');
  });

  it('si psql se detiene por un error de SQL, no espera al resto ni envía COMMIT', async () => {
    const psql = psqlFalso({ fallaAlVer: 'ERROR_SIMULADO' });
    const entrada = new PassThrough();
    entrada.write('SELECT ERROR_SIMULADO;\n'); // la entrada sigue abierta: no debe quedarse esperando
    await expect(cargarEnTransaccion({ entrada, origenTerminado: new Promise(() => undefined), psql })).rejects.toThrow('ERROR simulado');
    expect(psql.recibido()).not.toContain('COMMIT');
  });
});

describe('instantánea compartida del respaldo', () => {
  const carpeta = mkdtempSync(path.join(tmpdir(), 'psql-falso-'));
  afterAll(() => rmSync(carpeta, { recursive: true, force: true }));
  // Proceso que imita a psql: guarda lo que recibe y, al ver el \warn, responde la instantánea por stderr.
  const script = path.join(carpeta, 'psql-falso.cjs');
  writeFileSync(
    script,
    `const fs = require('node:fs');
let todo = '';
let dicho = false;
process.stdin.on('data', (dato) => {
  todo += dato;
  fs.writeFileSync(process.argv[2], todo);
  if (!dicho && todo.includes('\\\\warn INSTANTANEA=:instantanea')) {
    dicho = true;
    process.stderr.write('INSTANTANEA=00000003-0000001B-1\\n');
  }
});
process.stdin.on('end', () => process.exit(0));
`,
  );

  it('abre la transacción, devuelve el identificador y la cierra con COMMIT', async () => {
    const registro = path.join(carpeta, 'registro.txt');
    const sesion = await abrirInstantanea({}, [], { comando: process.execPath, argumentos: [script, registro] });
    expect(sesion.instantanea).toBe('00000003-0000001B-1');
    await sesion.cerrar();
    const recibido = readFileSync(registro, 'utf8');
    expect(recibido).toMatch(/^BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\nSELECT pg_export_snapshot\(\) AS instantanea \\gset\n/);
    expect(recibido.endsWith('COMMIT;\n')).toBe(true);
  });

  it('si psql no responde a tiempo, falla en lugar de quedarse esperando', async () => {
    const mudo = path.join(carpeta, 'mudo.cjs');
    writeFileSync(mudo, "process.stdin.resume(); process.stdin.on('end', () => process.exit(0));\n");
    await expect(abrirInstantanea({}, [], { comando: process.execPath, argumentos: [mudo], espera: 300 })).rejects.toThrow('a tiempo');
  });
});

// Cifrado de verdad con gpg (el de Git for Windows o el del sistema). Se salta si gpg no está instalado.
const hayGpg = spawnSync(binarioGpg(), ['--version'], { stdio: 'ignore' }).status === 0;

describe.skipIf(!hayGpg)('respaldo cifrado (con gpg)', () => {
  const carpeta = mkdtempSync(path.join(tmpdir(), 'prueba-respaldo-'));
  const archivo = path.join(carpeta, 'respaldo-prueba.sql.gz.gpg');
  const clave = 'clave-de-prueba-larga-y-no-secreta-123';
  afterAll(() => rmSync(carpeta, { recursive: true, force: true }));

  // SQL sintético con la forma de un pg_dump y relleno para pasar el tamaño mínimo.
  const sql = [
    ...MARCAS_REQUERIDAS.map((marca) => `${marca}(id uuid);`),
    ...Array.from({ length: 3000 }, (_, i) => `-- fila de relleno ${i} ${Math.random().toString(36)}`),
  ].join('\n');

  it('cifra con AES-256: el archivo no es SQL ni gzip en claro, no abre con otra clave y pasa la prueba de humo', async () => {
    await generarRespaldo({
      archivo,
      clave,
      fuentes: [
        async ({ escribir }) => escribir('SET session_replication_role = replica;\n'),
        async ({ canalizar }) => canalizar(Readable.from([sql])),
      ],
    });
    const crudo = readFileSync(archivo);
    expect(crudo.subarray(0, 2).equals(Buffer.from([0x1f, 0x8b]))).toBe(false);
    expect(crudo.toString('latin1')).not.toContain('CREATE TABLE');

    const resultado = await verificarRespaldo({ archivo, clave });
    expect(resultado.marcas).toBe(MARCAS_REQUERIDAS.length);

    await expect(leerRespaldo(archivo, 'otra-clave-cualquiera-1234', () => undefined)).rejects.toThrow();
  });

  // Descifra el archivo de la prueba con la clave dada (lanzar es JavaScript sin tipos: se le da uno aquí).
  const descifrar = (contrasena: string) => {
    const { hijo, terminado } = lanzar(binarioGpg(), ['--batch', '--quiet', '--no-tty', '--pinentry-mode', 'loopback', '--passphrase', contrasena, '--decrypt', archivo]);
    const salida = (hijo as unknown as ChildProcess).stdout as Readable;
    const gunzip = createGunzip();
    gunzip.on('error', () => salida.resume());
    salida.pipe(gunzip);
    return { gunzip, terminado: terminado as Promise<void> };
  };

  it('restaurar: una clave equivocada no deja nada confirmado', async () => {
    const psql = psqlFalso();
    const { gunzip, terminado } = descifrar('clave-equivocada-123456789');
    await expect(cargarEnTransaccion({ entrada: gunzip, origenTerminado: terminado, psql })).rejects.toThrow(/gpg/);
    expect(psql.recibido()).not.toContain('COMMIT');
    expect(psql.cortado()).toBe(true);
  });

  it('restaurar: con la clave correcta todo el SQL queda entre BEGIN y COMMIT', async () => {
    const psql = psqlFalso();
    const { gunzip, terminado } = descifrar(clave);
    await cargarEnTransaccion({ entrada: gunzip, origenTerminado: terminado, psql });
    expect(psql.recibido()).toMatch(/^BEGIN;\nSET session_replication_role = replica;\n/);
    expect(psql.recibido()).toMatch(/COPY auth\.users [\s\S]*\nCOMMIT;\n$/);
  });

  it('la prueba de humo falla si falta una tabla principal', async () => {
    const incompleto = path.join(carpeta, 'incompleto.sql.gz.gpg');
    await generarRespaldo({
      archivo: incompleto,
      clave,
      fuentes: [async ({ canalizar }) => canalizar(Readable.from([sql.replace('COPY auth.users ', 'COPY otra.tabla ')]))],
    });
    await expect(verificarRespaldo({ archivo: incompleto, clave })).rejects.toThrow(/le faltan: COPY auth.users/);
  });
});
