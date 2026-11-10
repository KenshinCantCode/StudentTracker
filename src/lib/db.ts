import bcrypt from "bcryptjs";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  school_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','admin')),
  course TEXT,
  photo BYTEA,
  photo_mime TEXT,
  photo_ver INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at DOUBLE PRECISION NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  time_in DOUBLE PRECISION NOT NULL,
  time_out DOUBLE PRECISION,
  job TEXT NOT NULL DEFAULT 'Duty'
);
CREATE INDEX IF NOT EXISTS idx_att_user_time ON attendance(user_id, time_in);
CREATE INDEX IF NOT EXISTS idx_att_open ON attendance(time_out);
CREATE TABLE IF NOT EXISTS hour_adjustments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_id INTEGER NOT NULL REFERENCES users(id),
  seconds INTEGER NOT NULL CHECK (seconds <> 0),
  reason TEXT NOT NULL,
  created_at DOUBLE PRECISION NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_adjust_user_time ON hour_adjustments(user_id, created_at);
`;

type Globals = typeof globalThis & { __pool?: Pool; __dbReady?: Promise<void> };
const g = globalThis as Globals;

function pool() {
  if (!g.__pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required. Add your Supabase PostgreSQL connection string.");
    g.__pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: process.env.NODE_ENV === "production" ? 1 : 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return g.__pool;
}

async function ensureDatabase() {
  if (!g.__dbReady) {
    g.__dbReady = (async () => {
      const p = pool();
      await p.query(SCHEMA);
      const { rows: [existing] } = await p.query("SELECT 1 FROM users LIMIT 1");
      if (!existing) {
        if (process.env.NODE_ENV === "production" && !process.env.ADMIN_PASSWORD) {
          throw new Error("Set ADMIN_PASSWORD before initializing the production database.");
        }
        const password = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "admin123", 10);
        const result = await p.query(
          `INSERT INTO users (school_id,name,email,password_hash,role,course,created_at)
           VALUES ('ADMIN','Administrator','admin@example.com',$1,'admin','Staff',$2)
           ON CONFLICT DO NOTHING`,
          [password, Date.now()]
        );
        if (result.rowCount) console.log("[dutytrack] Created initial admin account with School ID ADMIN.");
      }
    })();
  }
  await g.__dbReady;
}

export async function query<Row extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) {
  await ensureDatabase();
  return pool().query<Row>(text, values);
}

export async function transaction<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureDatabase();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
