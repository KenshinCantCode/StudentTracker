// Adds demo students + a few weeks of attendance to the configured PostgreSQL database.
// Usage: start the app once to create the schema, then `npm run seed:demo`.
import pg from "pg";
import bcrypt from "bcryptjs";
const { Pool } = pg;
const db = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const names = ["Justine Padilla", "Lance Louise Castor", "Lily Joy Regalado", "Melissa Blanco", "Philip Joaquin Cañada", "Prince Paul Almario", "Ralph David Montaño", "Stephanie Espinosa", "Vince Gallardo", "Jay Pacifico"];
const hash = bcrypt.hashSync("student123", 10);
const H = 3600_000;
const now = Date.now();

for (const [i, n] of names.entries()) {
  const sid = `04-0000-${String(100 + i).padStart(6, "0")}`;
  await db.query(
    "INSERT INTO users (school_id,name,email,password_hash,role,course,created_at) VALUES ($1,$2,$3,$4,'student','BSIT 2 Sem 1',$5) ON CONFLICT (school_id) DO NOTHING",
    [sid, n, `${n.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`, hash, now]
  );
  const { rows: [user] } = await db.query("SELECT id FROM users WHERE school_id=$1", [sid]);
  const uid = user.id;
  const { rowCount } = await db.query("SELECT 1 FROM attendance WHERE user_id=$1 LIMIT 1", [uid]);
  if (rowCount) continue;
  for (let d = 1; d <= 20; d++) {
    if ((d + i) % 3 === 0) continue;
    const start = new Date(now - d * 24 * H);
    start.setUTCHours(0, 0, 0, 0);
    const tin = start.getTime() + (23 + (i % 3)) * H; // ~7-9am Manila
    await db.query("INSERT INTO attendance (user_id,time_in,time_out) VALUES ($1,$2,$3)", [uid, tin, tin + (3 + ((d + i) % 6)) * H]);
  }
  if (i < 4) await db.query("INSERT INTO attendance (user_id,time_in,time_out) VALUES ($1,$2,NULL)", [uid, now - (1 + i) * H]);
}
await db.end();
console.log("Demo data added. Student logins: School ID 04-0000-000100 … / password: student123");
