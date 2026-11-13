// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { afterAll, describe, expect, it } from 'vitest';
import {
  MARCAS_REQUERIDAS,
  binarioGpg,
  crearBuscadorDeMarcas,
  disparadorIdempotente,
  esProduccion,
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
