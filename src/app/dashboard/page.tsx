import { requireUser } from "@/lib/auth";
import { recentAttendance, userStats } from "@/lib/queries";
import { fmtDate, fmtDur, fmtTime } from "@/lib/time";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const u = await requireUser();
  const [st, recent] = await Promise.all([userStats(u.id), recentAttendance(u.id, 5)]);
  const stats = [
    { t: "Total Hours", v: st.total, s: "Total rendered time" },
    { t: "Daily Average", v: st.daily, s: "Average hours per active day" },
    { t: "Weekly Average", v: st.weekly, s: "Average hours per week" },
  ];
  return (
    <>
      <h1 className="text-3xl font-extrabold">Dashboard</h1>
      <p className="mb-5 text-slate-500">Welcome! <b>{u.name.split(" ")[0]}</b></p>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((x) => (
          <div key={x.t} className="card text-center">
            <h4 className="mb-2.5 text-left text-sm font-semibold">{x.t}</h4>
            <div className="text-3xl font-extrabold">{fmtDur(x.v)}</div>
            <small className="text-xs text-slate-500">{x.s}</small>
          </div>
        ))}
      </div>
      <div className="card mt-5">
        <h3 className="font-bold">Recent Activity</h3>
        <p className="mb-3.5 text-sm text-slate-500">Your recent attendance records.</p>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-400">No recent activity recorded.</p>
        ) : (
          <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Time In</th><th>Time Out</th><th>Duration</th></tr></thead>
              <tbody>
                {recent.map((a) => (
                  <tr key={a.id}>
                    <td>{fmtDate(a.time_in)}</td>
                    <td>{fmtTime(a.time_in)}</td>
                    <td>{a.time_out ? fmtTime(a.time_out) : <span className="tag-active">ACTIVE</span>}</td>
                    <td>{fmtDur(a.secs)}</td>
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
