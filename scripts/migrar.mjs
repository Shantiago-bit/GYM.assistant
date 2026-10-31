import fs from 'node:fs';
import path from 'node:path';
import { crearCliente } from './conexion.mjs';

const carpeta = path.join(process.cwd(), 'supabase', 'migrations');

// Se aplicaron a mano antes de que existiera este script: se registran sin ejecutarlas.
const APLICADAS_ANTES = new Set(['20261017000000_create_users.sql']);

const cliente = crearCliente();

try {
  await cliente.connect();

  await cliente.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      nombre       TEXT PRIMARY KEY,
      aplicada_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE _migrations ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON _migrations FROM anon, authenticated;
  `);

  const { rows } = await cliente.query('SELECT nombre FROM _migrations');
  const registradas = new Set(rows.map((fila) => fila.nombre));
  const archivos = fs
    .readdirSync(carpeta)
    .filter((archivo) => archivo.endsWith('.sql'))
    .sort();

  for (const archivo of archivos) {
    if (registradas.has(archivo)) {
      console.log(`omitida: ${archivo}`);
      continue;
    }

    await cliente.query('BEGIN');
    try {
      if (APLICADAS_ANTES.has(archivo)) {
        console.log(`registrada sin ejecutar: ${archivo}`);
      } else {
        await cliente.query(fs.readFileSync(path.join(carpeta, archivo), 'utf8'));
        console.log(`aplicada: ${archivo}`);
      }
      await cliente.query('INSERT INTO _migrations (nombre) VALUES ($1)', [archivo]);
      await cliente.query('COMMIT');
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    }
  }
} catch (error) {
  console.error('La migración falló:', error.message);
  process.exitCode = 1;
} finally {
  await cliente.end().catch(() => {});
}
