import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fmtDur } from "@/lib/time";

export const dynamic = "force-dynamic";
const COOLDOWN_MS = 30_000;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const sid = String(body.school_id ?? "").trim();
  if (!sid) return NextResponse.json({ ok: false, error: "Please enter your School ID." }, { status: 422 });

  const d = db();
  const u = d.prepare("SELECT id,name,active FROM users WHERE school_id=?").get(sid) as { id: number; name: string; active: number } | undefined;
  if (!u) return NextResponse.json({ ok: false, error: "ID not found. Ask an admin to register you." }, { status: 404 });
  if (!u.active) return NextResponse.json({ ok: false, error: "This account is disabled." }, { status: 403 });

  const now = Date.now();
  const open = d.prepare("SELECT id,time_in FROM attendance WHERE user_id=? AND time_out IS NULL ORDER BY time_in DESC LIMIT 1").get(u.id) as
    | { id: number; time_in: number }
    | undefined;

  if (open) {
    if (now - open.time_in < COOLDOWN_MS) return NextResponse.json({ ok: false, error: "You just timed in. Wait a moment." }, { status: 429 });
    d.prepare("UPDATE attendance SET time_out=? WHERE id=?").run(now, open.id);
    return NextResponse.json({ ok: true, action: "out", name: u.name, duration: fmtDur((now - open.time_in) / 1000) });
  }

  const last = d.prepare("SELECT time_out FROM attendance WHERE user_id=? AND time_out IS NOT NULL ORDER BY time_out DESC LIMIT 1").get(u.id) as
    | { time_out: number }
    | undefined;
  if (last && now - last.time_out < COOLDOWN_MS) return NextResponse.json({ ok: false, error: "You just timed out. Wait a moment." }, { status: 429 });

  d.prepare("INSERT INTO attendance (user_id,time_in) VALUES (?,?)").run(u.id, now);
  return NextResponse.json({ ok: true, action: "in", name: u.name });
}
