import { Pool, QueryResult, QueryResultRow, types } from 'pg'

// Return date/timestamp columns as plain strings instead of JS Date objects.
// This keeps runtime types consistent with our TypeScript string declarations.
types.setTypeParser(1082, (val: string) => val)       // DATE        → 'YYYY-MM-DD'
types.setTypeParser(1114, (val: string) => val)       // TIMESTAMP   → string
types.setTypeParser(1184, (val: string) => val)       // TIMESTAMPTZ → string

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
