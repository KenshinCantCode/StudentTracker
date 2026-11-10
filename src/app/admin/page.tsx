import Link from "next/link";
import Avatar from "@/components/Avatar";
import { ConfirmButton } from "@/components/clients";
import Flash, { type SP } from "@/components/Flash";
import { forceAll, forceOut } from "@/app/actions/admin";
import { avatarSrc } from "@/lib/auth";
import { query } from "@/lib/db";
import { onDuty } from "@/lib/queries";
import { fmtDateTime, fmtDur, fmtHours, startOfDay, startOfWeek } from "@/lib/time";

export const metadata = { title: "Admin Overview" };

export default async function AdminHome({ searchParams }: { searchParams: Promise<SP> }) {
  const now = Date.now();
  const [studentsResult, todayResult, weekResult, forgotResult, duty] = await Promise.all([
    query<{ v: number }>("SELECT COUNT(*)::int v FROM users WHERE role='student' AND active=1"),
    query<{ v: number }>("SELECT COUNT(*)::int v FROM attendance WHERE time_in >= $1", [startOfDay(now)]),
    query<{ v: number }>(
      `SELECT COALESCE((SELECT SUM((COALESCE(time_out,$1)-time_in)/1000) FROM attendance WHERE time_in >= $2),0)
        + COALESCE((SELECT SUM(seconds)/3600.0 FROM hour_adjustments WHERE created_at >= $2),0) v`, [now, startOfWeek(now)]
    ),
    query<{ v: number }>("SELECT COUNT(*)::int v FROM attendance WHERE time_out IS NULL AND time_in < $1", [startOfDay(now)]),
    onDuty(),
  ]);
  const students = studentsResult.rows[0].v;
  const today = todayResult.rows[0].v;
  const week = weekResult.rows[0].v;
  const forgot = forgotResult.rows[0].v;

  const stats = [
    { t: "Active Students", v: students, s: "Registered & enabled" },
    { t: "On Duty Now", v: duty.length, s: "Currently timed in" },
    { t: "Punches Today", v: today, s: "Time-ins recorded today" },
    { t: "Hours This Week", v: fmtHours(week), s: "All students combined" },
  ];

  return (
    <>
      <Flash sp={await searchParams} />
      <h1 className="text-3xl font-extrabold">Overview</h1>
      <p className="mb-5 text-slate-500">Live attendance at a glance</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((x) => (
          <div key={x.t} className="card text-center">
            <h4 className="mb-2.5 text-left text-sm font-semibold">{x.t}</h4>
            <div className="text-3xl font-extrabold">{x.v}</div>
            <small className="text-xs text-slate-500">{x.s}</small>
          </div>
        ))}
      </div>

      {forgot > 0 && (
        <div className="mt-4 rounded-lg bg-red-100 px-4 py-2.5 text-sm text-red-800">
          {forgot} record(s) from earlier days were never timed out. Fix them under{" "}
          <Link href="/admin/attendance?status=open&from=2000-01-01" className="underline">Attendance</Link>.
        </div>
      )}

      <div className="card-w mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">Currently on duty</h3>
          {duty.length > 0 && (
            <form action={forceAll}>
              <ConfirmButton message="Time out everyone who is on duty?" className="btn btn-sm btn-danger">Time out all</ConfirmButton>
            </form>
          )}
        </div>
        {duty.length === 0 ? (
          <p className="py-6 text-center text-slate-500">Nobody is on duty right now.</p>
        ) : (
          <div className="overflow-auto rounded-lg border border-slate-200">
            <table className="tbl">
              <thead><tr><th>Student</th><th>Since</th><th>Elapsed</th><th /></tr></thead>
              <tbody>
                {duty.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={o.name} src={avatarSrc({ id: o.uid, photo_ver: o.photo_ver })} rounded="rounded-lg" />
                        <div><b>{o.name}</b><br /><small className="text-slate-500">{o.course}</small></div>
                      </div>
                    </td>
                    <td>{fmtDateTime(o.time_in)}</td>
                    <td>{fmtDur(o.secs)}</td>
                    <td className="text-right">
                      <form action={forceOut}><input type="hidden" name="id" value={o.id} /><button className="btn btn-sm btn-ghost">Time out</button></form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
