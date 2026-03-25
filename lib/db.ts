import { Pool, QueryResult, QueryResultRow } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL environment variable is required')
  return new Pool({ connectionString, max: 10 })
}

const pool = globalThis._pgPool ?? createPool()
if (process.env.NODE_ENV !== 'production') globalThis._pgPool = pool

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, values)
}

export async function getOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[]
): Promise<T | null> {
  const result = await pool.query<T>(text, values)
  return result.rows[0] ?? null
}

export async function getMany<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[]
): Promise<T[]> {
  const result = await pool.query<T>(text, values)
  return result.rows
}

export default pool
