import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

// La URL trae sslmode=require y pg le da prioridad sobre la opción ssl: se quita para que ssl aplique.
export function crearCliente() {
  const valor = process.env.GYMLEAD_POSTGRES_URL;
  if (!valor) {
    throw new Error('Falta la variable GYMLEAD_POSTGRES_URL en .env.local.');
  }

  const url = new URL(valor);
  url.searchParams.delete('sslmode');

  return new pg.Client({
    connectionString: url.toString(),
    ssl: {
      ca: fs.readFileSync(path.join(process.cwd(), 'supabase', 'ca.crt'), 'utf8'),
      rejectUnauthorized: true,
    },
  });
}
