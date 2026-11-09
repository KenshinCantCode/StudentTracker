// Adds demo students + a few weeks of attendance so you can see the dashboards filled in.
// Usage: start the app once (creates the DB), stop it, then `npm run seed:demo`.
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const file = process.env.DATABASE_FILE || path.join(process.cwd(), "data", "attendance.db");
const db = new Database(file);
db.pragma("foreign_keys = ON");

const names = ["Justine Padilla", "Lance Louise Castor", "Lily Joy Regalado", "Melissa Blanco", "Philip Joaquin Cañada", "Prince Paul Almario", "Ralph David Montaño", "Stephanie Espinosa", "Vince Gallardo", "Jay Pacifico"];
const hash = bcrypt.hashSync("student123", 10);
const insU = db.prepare("INSERT OR IGNORE INTO users (school_id,name,email,password_hash,role,course,created_at) VALUES (?,?,?,?, 'student','BSIT 2 Sem 1',?)");
const insA = db.prepare("INSERT INTO attendance (user_id,time_in,time_out) VALUES (?,?,?)");
const H = 3600_000;
const now = Date.now();

names.forEach((n, i) => {
  const sid = `04-0000-${String(100 + i).padStart(6, "0")}`;
  insU.run(sid, n, `${n.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`, hash, now);
  const uid = db.prepare("SELECT id FROM users WHERE school_id=?").get(sid).id;
  if (db.prepare("SELECT 1 FROM attendance WHERE user_id=?").get(uid)) return;
  for (let d = 1; d <= 20; d++) {
    if ((d + i) % 3 === 0) continue;
    const start = new Date(now - d * 24 * H);
    start.setUTCHours(0, 0, 0, 0);
    const tin = start.getTime() + (23 + (i % 3)) * H; // ~7-9am Manila
    insA.run(uid, tin, tin + (3 + ((d + i) % 6)) * H);
  }
  if (i < 4) insA.run(uid, now - (1 + i) * H, null); // a few currently on duty
});
console.log("Demo data added. Student logins: School ID 04-0000-000100 … / password: student123");
