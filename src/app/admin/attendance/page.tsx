import Link from "next/link";
import Flash, { one, type SP } from "@/components/Flash";
import { ConfirmButton } from "@/components/clients";
import { addRecord, deleteRecord, editRecord } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { adminFilter } from "@/lib/queries";
import { dayStart, fmtDate, fmtDur, fmtTime, monthStartInput, todayInput, toLocalInput } from "@/lib/time";

export const metadata = { title: "Attendance Records" };
const LIMIT = 500;

export default async function AdminAttendance({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const user = Number(one(sp.user)) || 0;
  const from = one(sp.from) || monthStartInput();
  const to = one(sp.to) || todayInput();
  const open = one(sp.status) === "open";
  const editId = Number(one(sp.edit)) || 0;

  const toMs = dayStart(to);
  const rows = await adminFilter({ user: user || undefined, from: dayStart(from), to: toMs == null ? null : toMs + 86400000, open, limit: LIMIT });
  const sum = rows.reduce((s, r) => s + r.secs, 0);
  const { rows: users } = await query<{ id: number; name: string; school_id: string }>("SELECT id,name,school_id FROM users WHERE active=1 ORDER BY name");
  const exportQs = new URLSearchParams({ user: String(user), from, to, ...(open ? { status: "open" } : {}) });

  return (
    <>
      <Flash sp={sp} />
      <h1 className="text-3xl font-extrabold">Attendance</h1>
      <p className="mb-5 text-slate-500">Review, correct and export records</p>

      <form className="card-w mb-5">
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="lbl">Student</label>
            <select name="user" defaultValue={user} className="field">
              <option value={0}>All</option>
              {users.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.school_id})</option>)}
            </select>
          </div>
          <div><label className="lbl">From</label><input type="date" name="from" defaultValue={from} className="field" /></div>
          <div><label className="lbl">To</label><input type="date" name="to" defaultValue={to} className="field" /></div>
          <div>
            <label className="lbl">Status</label>
            <select name="status" defaultValue={open ? "open" : ""} className="field"><option value="">All</option><option value="open">Not timed out</option></select>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-sm">Filter</button>
            <a className="btn btn-sm btn-ghost" href={`/api/admin/export?${exportQs}`}>Export CSV</a>
          </div>
        </div>
      </form>

      <form action={addRecord} className="card-w mb-5">
        <h3 className="mb-3 font-bold">Add manual record</h3>
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div><label className="lbl">Student</label><select name="user_id" className="field">{users.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          <div><label className="lbl">Time in</label><input type="datetime-local" name="time_in" required className="field" /></div>
          <div><label className="lbl">Time out</label><input type="datetime-local" name="time_out" className="field" /></div>
          <div><label className="lbl">Job</label><input name="job" placeholder="Duty" className="field" /></div>
          <div><button className="btn btn-sm">Add</button></div>
        </div>
      </form>

      <div className="card-w">
        <p className="mb-3.5 text-sm text-slate-500">
          {rows.length} record(s) · {fmtDur(sum)} total{rows.length === LIMIT ? ` (showing first ${LIMIT}; use Export CSV for all)` : ""}
        </p>
        <div className="overflow-auto rounded-lg border border-slate-200">
          <table className="tbl">
            <thead><tr><th>Student</th><th>Job</th><th>Date</th><th>In</th><th>Out</th><th>Duration</th><th /></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-slate-500">No records for this filter.</td></tr>}
              {rows.map((r) =>
                r.id === editId ? (
                  <tr key={r.id}>
                    <td colSpan={7}>
                      <form action={editRecord} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <input type="hidden" name="id" value={r.id} />
                        <div><label className="lbl">{r.name} · Time in</label><input type="datetime-local" name="time_in" defaultValue={toLocalInput(r.time_in)} required className="field" /></div>
                        <div><label className="lbl">Time out</label><input type="datetime-local" name="time_out" defaultValue={toLocalInput(r.time_out)} className="field" /></div>
                        <div><label className="lbl">Job</label><input name="job" defaultValue={r.job} className="field" /></div>
                        <div className="flex gap-2"><button className="btn btn-sm">Save</button><Link href="/admin/attendance" className="btn btn-sm btn-ghost">Cancel</Link></div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={r.id}>
                    <td><b>{r.name}</b><br /><small className="text-slate-500">{r.school_id}</small></td>
                    <td>{r.job}</td>
                    <td>{fmtDate(r.time_in)}</td>
                    <td>{fmtTime(r.time_in)}</td>
                    <td>{r.time_out ? fmtTime(r.time_out) : <span className="tag-active">ACTIVE</span>}</td>
                    <td>{fmtDur(r.secs)}</td>
                    <td className="whitespace-nowrap text-right">
                      <div className="flex justify-end gap-1.5">
                        <Link href={`/admin/attendance?edit=${r.id}`} className="btn btn-sm btn-ghost">Edit</Link>
                        <form action={deleteRecord}><input type="hidden" name="id" value={r.id} /><ConfirmButton message="Delete this record?" className="btn btn-sm btn-danger">Delete</ConfirmButton></form>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
