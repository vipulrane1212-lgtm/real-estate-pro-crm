import { Pool } from 'pg';

let globalPool: Pool | null = null;

export function getDbPool(): Pool {
  if (!globalPool) {
    const connectionString =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      'postgresql://postgres:postgres@172.31.128.153:5432/diksha_crm';

    const isLocalDb =
      connectionString.includes('localhost') ||
      connectionString.includes('127.0.0.1') ||
      connectionString.includes('172.31.');

    globalPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      ssl: isLocalDb ? undefined : { rejectUnauthorized: false },
    });

    globalPool.on('error', (err) => {
      console.error('Unexpected idle client error in PostgreSQL pool', err);
    });
  }

  return globalPool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const pool = getDbPool();
  const res = await pool.query(text, params);
  return res.rows as T[];
}
