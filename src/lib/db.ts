import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import bcrypt from "bcryptjs";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','admin')),
  course TEXT,
  photo BLOB,
  photo_mime TEXT,
  photo_ver INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at REAL NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  time_in REAL NOT NULL,
  time_out REAL,
  job TEXT NOT NULL DEFAULT 'Duty'
);
CREATE INDEX IF NOT EXISTS idx_att_user_time ON attendance(user_id, time_in);
CREATE INDEX IF NOT EXISTS idx_att_open ON attendance(time_out);
CREATE TABLE IF NOT EXISTS hour_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_id INTEGER NOT NULL REFERENCES users(id),
  seconds INTEGER NOT NULL CHECK (seconds <> 0),
  reason TEXT NOT NULL,
  created_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_adjust_user_time ON hour_adjustments(user_id, created_at);
`;

export type QueryResultRow = Record<string, unknown>;
type SqliteValue = null | number | bigint | string | NodeJS.ArrayBufferView;
type QueryResult<Row> = { rows: Row[]; rowCount: number };
type Globals = typeof globalThis & { __db?: DatabaseSync; __dbReady?: Promise<void> };
const g = globalThis as Globals;

function database() {
  if (!g.__db) {
    const filename = process.env.SQLITE_PATH || join(process.cwd(), "data", "dutytrack.sqlite");
    if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true });
    const db = new DatabaseSync(filename);
    db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
    g.__db = db;
  }
  return g.__db;
}

function prepare(text: string): StatementSync {
  return database().prepare(text.replace(/\$(\d+)/g, "?$1"));
}

function run<Row extends QueryResultRow>(text: string, values: SqliteValue[] = []): QueryResult<Row> {
  const statement = prepare(text);
  if (statement.columns().length > 0) {
    const rows = statement.all(...values) as Row[];
    return { rows, rowCount: rows.length };
  }
  const result = statement.run(...values);
  return { rows: [], rowCount: Number(result.changes) };
}

async function ensureDatabase() {
  if (!g.__dbReady) {
    g.__dbReady = (async () => {
      const db = database();
      db.exec(SCHEMA);
      const existing = db.prepare("SELECT 1 FROM users LIMIT 1").get();
      if (!existing) {
        if (process.env.NODE_ENV === "production" && !process.env.ADMIN_PASSWORD) {
          throw new Error("Set ADMIN_PASSWORD before initializing the production database.");
        }
        const password = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "admin123", 10);
        const result = run(
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

export async function query<Row extends QueryResultRow = QueryResultRow>(text: string, values: SqliteValue[] = []) {
  await ensureDatabase();
  return run<Row>(text, values);
}

type SqliteClient = {
  query: typeof query;
};

export async function transaction<T>(callback: (client: SqliteClient) => Promise<T>): Promise<T> {
  await ensureDatabase();
  const db = database();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = await callback({ query });
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
