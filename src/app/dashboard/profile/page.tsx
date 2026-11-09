import Avatar from "@/components/Avatar";
import Flash, { type SP } from "@/components/Flash";
import { changePassword, uploadPhoto } from "@/app/actions/profile";
import { avatarSrc, requireUser } from "@/lib/auth";
import { isOnDuty, userStats } from "@/lib/queries";
import { fmtHours } from "@/lib/time";

export const metadata = { title: "My Profile" };

export default async function Profile({ searchParams }: { searchParams: Promise<SP> }) {
  const u = await requireUser();
  const st = userStats(u.id);
  const on = isOnDuty(u.id);
  const stats = [
    { v: fmtHours(st.total), l: "Total Hours" },
    { v: fmtHours(st.daily), l: "Daily Average" },
    { v: fmtHours(st.weekly), l: "Weekly Average" },
    { v: on ? "On Duty" : "Off Duty", l: "Status" },
  ];
  return (
    <>
      <Flash sp={await searchParams} />
      <div className="text-center">
        <Avatar name={u.name} src={avatarSrc(u)} className="relative z-10 -mb-[90px] inline-block h-[200px] w-[200px] border-4 border-slate-200 text-5xl" />
        <div className="card pt-[100px]">
          <h2 className="text-2xl font-extrabold">{u.name}</h2>
          <p className="text-sm text-slate-500">✉ {u.email}</p>
          {u.course && <p className="text-sm text-slate-500">🎓 {u.course}</p>}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.l} className="card text-center">
              <div className="text-2xl font-extrabold">{s.v}</div>
              <small className="text-xs text-slate-500">{s.l}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <form action={uploadPhoto} className="card-w">
          <h3 className="font-bold">Profile photo</h3>
          <p className="mb-3 text-sm text-slate-500">JPG, PNG or WEBP, up to 2 MB.</p>
          <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required className="mb-3 block text-sm" />
          <button className="btn btn-sm">Upload</button>
        </form>
        <form action={changePassword} className="card-w">
          <h3 className="mb-3 font-bold">Change password</h3>
          <label className="lbl">Current password</label>
          <input type="password" name="current" required className="field mb-3" />
          <label className="lbl">New password (min 8)</label>
          <input type="password" name="new" minLength={8} required className="field mb-3" />
          <button className="btn btn-sm">Update</button>
        </form>
      </div>
    </>
  );
}
