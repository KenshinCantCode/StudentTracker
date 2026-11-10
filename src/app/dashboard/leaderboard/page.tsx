import Avatar from "@/components/Avatar";
import { AutoSelect } from "@/components/clients";
import { one, type SP } from "@/components/Flash";
import { avatarSrc, requireUser } from "@/lib/auth";
import { leaderboard } from "@/lib/queries";
import { fmtDur, parseRange, RANGES } from "@/lib/time";

export const metadata = { title: "Leaderboards" };

export default async function Leaderboard({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await requireUser();
  const range = parseRange(one((await searchParams).range));
  const rows = await leaderboard(range);
  const top = rows.slice(0, 3);
  const slots = [
    { i: 1, bar: "h-[130px] from-gray-200 to-slate-300", img: "h-[84px] w-[84px]", medal: "🥈" },
    { i: 0, bar: "h-[190px] from-yellow-300 to-amber-400", img: "h-[130px] w-[130px]", medal: "🏆" },
    { i: 2, bar: "h-[100px] from-orange-300 to-orange-500", img: "h-[84px] w-[84px]", medal: "🥉" },
  ];

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Leaderboards</h1>
          <p className="text-slate-500">Top performing students by hours rendered</p>
        </div>
        <form>
          <AutoSelect name="range" defaultValue={range} className="field w-auto">
            {Object.entries(RANGES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </AutoSelect>
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="card-w py-10 text-center text-slate-500">No attendance recorded for this period yet.</div>
      ) : (
        <div className="card-w">
          <div className="flex min-h-[340px] items-end justify-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-b from-sky-200 via-sky-50 to-green-600 px-3 pt-5 [background-size:100%_100%]">
            {slots.map(({ i, bar, img, medal }) => {
              const r = top[i];
              if (!r) return <div key={i} className="w-24 sm:w-44" />;
              return (
                <div key={i} className="w-24 text-center sm:w-44">
                  <div className="relative inline-block">
                    <Avatar name={r.name} src={avatarSrc(r)} className={img} rounded="rounded-xl" />
                    <span className="absolute -bottom-2 -right-2 text-2xl">{medal}</span>
                  </div>
                  <b className="mt-2 block text-sm">{r.name}</b>
                  <span className="text-sm">{fmtDur(r.secs)}</span>
                  <div className={`mt-2.5 rounded-t-lg bg-gradient-to-b opacity-90 ${bar}`} />
                </div>
              );
            })}
          </div>
          {rows.length > 3 && (
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="tbl">
                <tbody>
                  {rows.slice(3).map((r, n) => (
                    <tr key={r.id} className={r.id === me.id ? "bg-blue-50" : ""}>
                      <td className="w-10 font-bold text-slate-500">{n + 4}</td>
                      <td><div className="flex items-center gap-2.5"><Avatar name={r.name} src={avatarSrc(r)} rounded="rounded-lg" />{r.name}</div></td>
                      <td className="text-right font-bold">{fmtDur(r.secs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
