import { NextResponse } from "next/server";
import { query, transaction } from "@/lib/db";
import { fmtDur } from "@/lib/time";

export const dynamic = "force-dynamic";
const COOLDOWN_MS = 30_000;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const sid = String(body.school_id ?? "").trim();
  if (!sid) return NextResponse.json({ ok: false, error: "Please enter your School ID." }, { status: 422 });

  const { rows: [u] } = await query<{ id: number; name: string; active: number }>("SELECT id,name,active FROM users WHERE school_id=$1", [sid]);
  if (!u) return NextResponse.json({ ok: false, error: "ID not found. Ask an admin to register you." }, { status: 404 });
  if (!u.active) return NextResponse.json({ ok: false, error: "This account is disabled." }, { status: 403 });

  const now = Date.now();
  const { rows: [open] } = await query<{ id: number; time_in: number }>(
    "SELECT id,time_in FROM attendance WHERE user_id=$1 AND time_out IS NULL ORDER BY time_in DESC LIMIT 1", [u.id]
  );

  if (open) {
    if (now - open.time_in < COOLDOWN_MS) return NextResponse.json({ ok: false, error: "You just timed in. Wait a moment." }, { status: 429 });
    await query("UPDATE attendance SET time_out=$1 WHERE id=$2", [now, open.id]);
    return NextResponse.json({ ok: true, action: "out", name: u.name, duration: fmtDur((now - open.time_in) / 1000) });
  }

  const { rows: [last] } = await query<{ time_out: number }>(
    "SELECT time_out FROM attendance WHERE user_id=$1 AND time_out IS NOT NULL ORDER BY time_out DESC LIMIT 1", [u.id]
  );
  if (last && now - last.time_out < COOLDOWN_MS) return NextResponse.json({ ok: false, error: "You just timed out. Wait a moment." }, { status: 429 });

  await query("INSERT INTO attendance (user_id,time_in) VALUES ($1,$2)", [u.id, now]);
  return NextResponse.json({ ok: true, action: "in", name: u.name });
}
