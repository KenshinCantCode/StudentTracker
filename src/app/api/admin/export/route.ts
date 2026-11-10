import { getUser } from "@/lib/auth";
import { adminFilter } from "@/lib/queries";
import { dayStart, TZ, todayInput, monthStartInput } from "@/lib/time";

export const dynamic = "force-dynamic";

const csv = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // neutralize spreadsheet formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const u = await getUser();
  if (!u || u.role !== "admin") return new Response("Forbidden", { status: 403 });

  const p = new URL(req.url).searchParams;
  const from = p.get("from") || monthStartInput();
  const to = p.get("to") || todayInput();
  const fs = dayStart(from);
  const te = dayStart(to);
  const rows = await adminFilter({
    user: Number(p.get("user")) || undefined,
    from: fs,
    to: te == null ? null : te + 86400000,
    open: p.get("status") === "open",
  });

  const t = (ms: number, o: Intl.DateTimeFormatOptions) => new Date(ms).toLocaleString("en-CA", { timeZone: TZ, hour12: false, ...o });
  const lines = [["School ID", "Name", "Job", "Date", "Time In", "Time Out", "Hours"].join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.school_id,
        r.name,
        r.job,
        t(r.time_in, { year: "numeric", month: "2-digit", day: "2-digit" }),
        t(r.time_in, { hour: "2-digit", minute: "2-digit" }),
        r.time_out ? t(r.time_out, { hour: "2-digit", minute: "2-digit" }) : "",
        (r.secs / 3600).toFixed(2),
      ]
        .map(csv)
        .join(",")
    );
  }
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="attendance_${from}_${to}.csv"` },
  });
}
