import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

// La URL trae sslmode=require y pg le da prioridad sobre la opción ssl: se quita para que ssl aplique.
// Por defecto usa GYMLEAD_POSTGRES_URL; se le puede pasar otra (por ejemplo, la de una base restaurada para
// probarla con db:verificar). Una base local (localhost) se conecta sin SSL.
export function crearCliente(valor = process.env.GYMLEAD_POSTGRES_URL) {
  if (!valor) {
    throw new Error('Falta la variable GYMLEAD_POSTGRES_URL en .env.local.');
  }

  const url = new URL(valor);
  url.searchParams.delete('sslmode');
  const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname);

  return new pg.Client({
    connectionString: url.toString(),
    ssl: local
      ? false
      : {
          ca: fs.readFileSync(path.join(process.cwd(), 'supabase', 'ca.crt'), 'utf8'),
          rejectUnauthorized: true,
        },
  });
}
