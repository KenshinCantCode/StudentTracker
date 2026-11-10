import Link from "next/link";
import { AutoSelect } from "@/components/clients";
import { one, type SP } from "@/components/Flash";
import { requireUser } from "@/lib/auth";
import { attendancePage } from "@/lib/queries";
import { fmtDate, fmtDur, fmtTime, parseRange, RANGES } from "@/lib/time";

export const metadata = { title: "My Attendance" };

export default async function MyAttendance({ searchParams }: { searchParams: Promise<SP> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const per = [10, 15, 25, 50].includes(Number(one(sp.per))) ? Number(one(sp.per)) : 15;
  const order = one(sp.order) === "old" ? "ASC" : "DESC";
  const range = parseRange(one(sp.range));
  const { rows, pages, page } = await attendancePage(u.id, { per, order, range, page: Number(one(sp.p)) || 1 });

  const link = (p: number) => {
    const q = new URLSearchParams({ per: String(per), order: order === "ASC" ? "old" : "new", range, p: String(p) });
    return `/dashboard/my-attendance?${q}`;
  };

  return (
    <>
      <h1 className="text-3xl font-extrabold">My Attendance</h1>
      <p className="mb-5 text-slate-500">View your attendance history</p>
      <div className="card-w">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold">Attendance History</h3>
          <form className="flex flex-wrap gap-2">
            <AutoSelect name="per" defaultValue={per} className="field w-auto">{[10, 15, 25, 50].map((n) => <option key={n}>{n}</option>)}</AutoSelect>
            <AutoSelect name="order" defaultValue={order === "ASC" ? "old" : "new"} className="field w-auto"><option value="new">Newest</option><option value="old">Oldest</option></AutoSelect>
            <AutoSelect name="range" defaultValue={range} className="field w-auto">{Object.entries(RANGES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</AutoSelect>
          </form>
        </div>
        <div className="overflow-auto rounded-lg border border-slate-200">
          <table className="tbl">
            <thead><tr><th>Job</th><th>Date</th><th>Time In</th><th>Time Out</th><th>Duration</th><th>Status</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-500">No results.</td></tr>}
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>{a.job}</td><td>{fmtDate(a.time_in)}</td><td>{fmtTime(a.time_in)}</td><td>{fmtTime(a.time_out)}</td><td>{fmtDur(a.secs)}</td>
                  <td>{a.time_out ? <span className="tag-done">COMPLETED</span> : <span className="tag-active">ACTIVE</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3.5 flex items-center justify-end gap-2.5 text-sm text-slate-500">
          {page > 1 && <Link className="btn btn-sm btn-ghost" href={link(page - 1)}>Previous</Link>}
          Page {page} of {pages}
          {page < pages && <Link className="btn btn-sm btn-ghost" href={link(page + 1)}>Next</Link>}
        </div>
      </div>
    </>
  );
}
