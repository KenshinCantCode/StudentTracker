import { db } from "./db";
import { TZ_OFFSET_MIN, rangeStart, type Range } from "./time";

export type AttRow = {
  id: number;
  user_id: number;
  time_in: number;
  time_out: number | null;
  job: string;
  secs: number;
};
export type AttRowFull = AttRow & { name: string; school_id: string; photo_ver: number };

const SECS = "((COALESCE(a.time_out,@now)-a.time_in)/1000)";

export function userStats(uid: number) {
  const off = TZ_OFFSET_MIN * 60;
  const r = db()
    .prepare(
      `SELECT COALESCE(SUM(${SECS}),0) total,
        COUNT(DISTINCT strftime('%Y-%m-%d', a.time_in/1000+@off,'unixepoch')) days,
        COUNT(DISTINCT strftime('%Y-%W', a.time_in/1000+@off,'unixepoch')) weeks
       FROM attendance a WHERE a.user_id=@uid`
    )
    .get({ uid, off, now: Date.now() }) as { total: number; days: number; weeks: number };
  return {
    total: r.total,
    daily: r.days ? Math.floor(r.total / r.days) : 0,
    weekly: r.weeks ? Math.floor(r.total / r.weeks) : 0,
  };
}

export const isOnDuty = (uid: number) =>
  !!db().prepare("SELECT 1 FROM attendance WHERE user_id=? AND time_out IS NULL LIMIT 1").get(uid);

export function recentAttendance(uid: number, limit = 5) {
  return db()
    .prepare(`SELECT a.*, ${SECS} secs FROM attendance a WHERE a.user_id=@uid ORDER BY a.time_in DESC LIMIT @limit`)
    .all({ uid, limit, now: Date.now() }) as AttRow[];
}

export function attendancePage(uid: number, o: { per: number; order: "ASC" | "DESC"; range: Range; page: number }) {
  const since = rangeStart(o.range);
  const total = (
    db().prepare("SELECT COUNT(*) c FROM attendance WHERE user_id=? AND time_in>=?").get(uid, since) as { c: number }
  ).c;
  const pages = Math.max(1, Math.ceil(total / o.per));
  const page = Math.min(Math.max(1, o.page), pages);
  const rows = db()
    .prepare(
      `SELECT a.*, ${SECS} secs FROM attendance a WHERE a.user_id=@uid AND a.time_in>=@since
       ORDER BY a.time_in ${o.order} LIMIT @per OFFSET @off`
    )
    .all({ uid, since, per: o.per, off: (page - 1) * o.per, now: Date.now() }) as AttRow[];
  return { rows, total, pages, page };
}

export function leaderboard(range: Range) {
  return db()
    .prepare(
      `SELECT u.id,u.name,u.course,u.photo_ver, SUM(${SECS}) secs
       FROM attendance a JOIN users u ON u.id=a.user_id
       WHERE u.role='student' AND u.active=1 AND a.time_in>=@since
       GROUP BY u.id ORDER BY secs DESC LIMIT 50`
    )
    .all({ since: rangeStart(range), now: Date.now() }) as { id: number; name: string; course: string | null; photo_ver: number; secs: number }[];
}

export function onDuty() {
  return db()
    .prepare(
      `SELECT a.id, a.time_in, u.id uid, u.name, u.course, u.photo_ver, ${SECS} secs
       FROM attendance a JOIN users u ON u.id=a.user_id
       WHERE a.time_out IS NULL ORDER BY a.time_in`
    )
    .all({ now: Date.now() }) as { id: number; time_in: number; uid: number; name: string; course: string | null; photo_ver: number; secs: number }[];
}

export function adminFilter(f: { user?: number; from: number | null; to: number | null; open?: boolean; limit?: number }) {
  const where: string[] = [];
  const p: Record<string, number> = { now: Date.now() };
  if (f.from != null) (where.push("a.time_in>=@from"), (p.from = f.from));
  if (f.to != null) (where.push("a.time_in<@to"), (p.to = f.to));
  if (f.user) (where.push("a.user_id=@user"), (p.user = f.user));
  if (f.open) where.push("a.time_out IS NULL");
  const sql = `SELECT a.*, u.name, u.school_id, u.photo_ver, ${SECS} secs
    FROM attendance a JOIN users u ON u.id=a.user_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY a.time_in DESC ${f.limit ? "LIMIT " + Number(f.limit) : ""}`;
  return db().prepare(sql).all(p) as AttRowFull[];
}
