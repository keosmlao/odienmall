import "server-only";
import { Pool, type QueryResultRow } from "pg";

// A single pooled connection to the ODG ERP Postgres, reused across requests.
// In dev, Next.js HMR re-evaluates modules, so we cache the pool on globalThis
// to avoid leaking connections on every hot reload.
const globalForPg = globalThis as unknown as { _odgPool?: Pool };

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill in the ODG Postgres credentials.",
    );
  }
  return new Pool({
    connectionString,
    // The ERP is reached over a plain (non-SSL) Postgres connection.
    ssl: false,
    max: 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    // The storefront is strictly read-only against production data.
    statement_timeout: 20_000,
  });
}

export const pool: Pool = globalForPg._odgPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForPg._odgPool = pool;

/** Run a parameterised query and return its rows, typed by the caller. */
export async function query<T extends QueryResultRow>(
  text: string,
  params: ReadonlyArray<unknown> = [],
): Promise<T[]> {
  const res = await pool.query<T>(text, params as unknown[]);
  return res.rows;
}

/** Run a query expected to return a single row (or null). */
export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: ReadonlyArray<unknown> = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
