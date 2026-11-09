import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { avatarSrc } from "@/lib/auth";
import { fmtDur, fmtTime, startOfDay } from "@/lib/time";

export const dynamic = "force-dynamic";

type Row = { id: number; name: string; photo_ver: number; time_in: number; time_out: number | null };

export async function GET(req: Request) {
  const d = db();
  const duty = (
    d.prepare("SELECT u.name FROM attendance a JOIN users u ON u.id=a.user_id WHERE a.time_out IS NULL ORDER BY a.time_in").all() as { name: string }[]
  ).map((r) => r.name);

  let log: unknown[] = [];
  if (new URL(req.url).searchParams.get("log") === "1") {
    const rows = d
      .prepare(
        `SELECT u.id,u.name,u.photo_ver,a.time_in,a.time_out FROM attendance a JOIN users u ON u.id=a.user_id
         WHERE a.time_in>=? ORDER BY a.time_in DESC`
      )
      .all(startOfDay(Date.now())) as Row[];
    log = rows.map((r) => ({
      name: r.name,
      photo: avatarSrc({ id: r.id, photo_ver: r.photo_ver }),
      in: fmtTime(r.time_in),
      out: r.time_out ? fmtTime(r.time_out) : null,
      dur: r.time_out ? fmtDur((r.time_out - r.time_in) / 1000) : "",
    }));
  }
  return NextResponse.json({ duty, log });
}
