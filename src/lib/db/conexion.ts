import { Pool, types, type PoolClient, type QueryResultRow } from 'pg';
import { traducirErrorPostgres } from '@/lib/reglas/errores';

types.setTypeParser(1082, (v) => v);                 // DATE → 'YYYY-MM-DD'
types.setTypeParser(1114, (v) => v);                 // TIMESTAMP → texto
types.setTypeParser(1184, (v) => v);                 // TIMESTAMPTZ → texto
types.setTypeParser(20, (v) => parseInt(v, 10));     // BIGINT (COUNT) → number

// La URL trae sslmode=require y pg le da prioridad sobre la opción ssl: se quita para que ssl aplique.
function urlDeConexion(): string | undefined {
  const valor = process.env.GYMLEAD_POSTGRES_URL;
  if (!valor) {
    return undefined;
  }

  const url = new URL(valor);
  url.searchParams.delete('sslmode');
  return url.toString();
}

const globalParaPool = globalThis as unknown as { poolGym?: Pool };
const connectionString = urlDeConexion();

export const pool =
  globalParaPool.poolGym ??
  new Pool({
    ...(connectionString ? { connectionString } : {}),
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10_000,
  });
if (process.env.NODE_ENV !== 'production') globalParaPool.poolGym = pool;

export async function consultar<T extends QueryResultRow>(
  sql: string,
  valores: unknown[] = [],
): Promise<T[]> {
  try {
    const { rows } = await pool.query<T>(sql, valores);
    return rows;
  } catch (error) {
    throw traducirErrorPostgres(error) ?? error;
  }
}

export async function conTransaccion<T>(trabajo: (tx: PoolClient) => Promise<T>): Promise<T> {
  const tx = await pool.connect();

  try {
    await tx.query('BEGIN');
    const resultado = await trabajo(tx);
    await tx.query('COMMIT');
    return resultado;
  } catch (error) {
    await tx.query('ROLLBACK');
    throw traducirErrorPostgres(error) ?? error;
  } finally {
    tx.release();
  }
}
