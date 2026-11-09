import Link from "next/link";
import Avatar from "@/components/Avatar";
import { ConfirmButton, ResetPasswordButton } from "@/components/clients";
import Flash, { one, type SP } from "@/components/Flash";
import { addUser, deleteUser, editUser, resetPassword, toggleUser } from "@/app/actions/admin";
import { avatarSrc, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtHours } from "@/lib/time";

export const metadata = { title: "Students" };

type Row = { id: number; school_id: string; name: string; email: string; role: string; course: string | null; active: number; photo_ver: number; secs: number };

export default async function Students({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const q = (one(sp.q) ?? "").trim();
  const editId = Number(one(sp.edit)) || 0;
  const rows = db()
    .prepare(
      `SELECT u.id,u.school_id,u.name,u.email,u.role,u.course,u.active,u.photo_ver,
        (SELECT COALESCE(SUM((COALESCE(time_out,@now)-time_in)/1000),0) FROM attendance WHERE user_id=u.id) secs
       FROM users u WHERE (@q='' OR u.name LIKE '%'||@q||'%' OR u.school_id LIKE '%'||@q||'%') ORDER BY u.role, u.name`
    )
    .all({ q, now: Date.now() }) as Row[];

  return (
    <>
      <Flash sp={sp} />
      <h1 className="text-3xl font-extrabold">Students</h1>
      <p className="mb-5 text-slate-500">Register, edit and manage accounts</p>

      <form action={addUser} className="card-w mb-5">
        <h3 className="mb-3 font-bold">Add account</h3>
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><label className="lbl">School ID</label><input name="school_id" required className="field" /></div>
          <div><label className="lbl">Full name</label><input name="name" required className="field" /></div>
          <div><label className="lbl">Email</label><input type="email" name="email" required className="field" /></div>
          <div><label className="lbl">Course / Year</label><input name="course" placeholder="BSIT 2 Sem 1" className="field" /></div>
          <div><label className="lbl">Password (blank = School ID)</label><input name="password" className="field" /></div>
          <div><label className="lbl">Role</label><select name="role" className="field"><option value="student">Student</option><option value="admin">Admin</option></select></div>
          <div><button className="btn">Add</button></div>
        </div>
      </form>

      <div className="card-w">
        <form className="mb-3.5 flex gap-2">
          <input name="q" defaultValue={q} placeholder="Search name or ID" className="field w-64" />
          <button className="btn btn-sm">Search</button>
        </form>
        <div className="overflow-auto rounded-lg border border-slate-200">
          <table className="tbl">
            <thead><tr><th>Student</th><th>School ID</th><th>Course</th><th>Hours</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-500">No accounts found.</td></tr>}
              {rows.map((r) =>
                r.id === editId ? (
                  <tr key={r.id}>
                    <td colSpan={6}>
                      <form action={editUser} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <input type="hidden" name="id" value={r.id} />
                        <div><label className="lbl">Name</label><input name="name" defaultValue={r.name} required className="field" /></div>
                        <div><label className="lbl">School ID</label><input name="school_id" defaultValue={r.school_id} required className="field" /></div>
                        <div><label className="lbl">Email</label><input name="email" defaultValue={r.email} required className="field" /></div>
                        <div><label className="lbl">Course</label><input name="course" defaultValue={r.course ?? ""} className="field" /></div>
                        <div><label className="lbl">Role</label><select name="role" defaultValue={r.role} className="field"><option value="student">Student</option><option value="admin">Admin</option></select></div>
                        <div className="flex gap-2"><button className="btn btn-sm">Save</button><Link href="/admin/students" className="btn btn-sm btn-ghost">Cancel</Link></div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={r.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.name} src={avatarSrc(r)} rounded="rounded-lg" />
                        <div>
                          <b>{r.name}</b> {r.role === "admin" && <span className="tag-active">ADMIN</span>}
                          <br /><small className="text-slate-500">{r.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>{r.school_id}</td>
                    <td>{r.course}</td>
                    <td>{fmtHours(r.secs)}</td>
                    <td>{r.active ? <span className="tag-active">ACTIVE</span> : <span className="tag-done">DISABLED</span>}</td>
                    <td className="whitespace-nowrap text-right">
                      <div className="flex justify-end gap-1.5">
                        <Link href={`/admin/students?edit=${r.id}`} className="btn btn-sm btn-ghost">Edit</Link>
                        <form action={resetPassword}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="new" /><ResetPasswordButton name={r.name} /></form>
                        {r.id !== me.id && (
                          <>
                            <form action={toggleUser}><input type="hidden" name="id" value={r.id} /><button className="btn btn-sm btn-ghost">{r.active ? "Disable" : "Enable"}</button></form>
                            <form action={deleteUser}><input type="hidden" name="id" value={r.id} /><ConfirmButton message="Delete this account and ALL its attendance records?" className="btn btn-sm btn-danger">Delete</ConfirmButton></form>
                          </>
                        )}
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
