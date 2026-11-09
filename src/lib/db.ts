import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','admin')),
  course TEXT,
  photo BLOB,
  photo_mime TEXT,
  photo_ver INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  time_in INTEGER NOT NULL,
  time_out INTEGER,
  job TEXT NOT NULL DEFAULT 'Duty'
);
CREATE INDEX IF NOT EXISTS idx_att_user_time ON attendance(user_id, time_in);
CREATE INDEX IF NOT EXISTS idx_att_open ON attendance(time_out);
`;

const g = globalThis as unknown as { __db?: Database.Database };

export function db(): Database.Database {
  if (!g.__db) {
    const file = process.env.DATABASE_FILE || path.join(process.cwd(), "data", "attendance.db");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const d = new Database(file);
    d.pragma("journal_mode = WAL");
    d.pragma("foreign_keys = ON");
    d.exec(SCHEMA);

    // First run: create the default admin.
    const n = (d.prepare("SELECT COUNT(*) c FROM users").get() as { c: number }).c;
    if (n === 0) {
      const pw = process.env.ADMIN_PASSWORD || "admin123";
      d.prepare(
        "INSERT INTO users (school_id,name,email,password_hash,role,course,created_at) VALUES ('ADMIN','Administrator','admin@example.com',?, 'admin','Staff',?)"
      ).run(bcrypt.hashSync(pw, 10), Date.now());
      console.log("[dutytrack] Created default admin. School ID: ADMIN  Password: " + (process.env.ADMIN_PASSWORD ? "(from ADMIN_PASSWORD)" : "admin123 — change it after logging in!"));
    }
    g.__db = d;
  }
  return g.__db;
}
