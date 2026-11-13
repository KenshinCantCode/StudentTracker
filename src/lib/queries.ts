import { query } from "./db";
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

const SECS = "((COALESCE(a.time_out,$1)-a.time_in)/1000)";

export async function userStats(uid: number) {
  const off = TZ_OFFSET_MIN * 60;
  const { rows: [r] } = await query<{ total: number; days: number; weeks: number }>(
    `SELECT COALESCE(SUM(${SECS}),0) + COALESCE((SELECT SUM(seconds) FROM hour_adjustments WHERE user_id=$2),0) total,
      COUNT(DISTINCT date(a.time_in/1000,'unixepoch',printf('%+d seconds',$3))) days,
      COUNT(DISTINCT date(a.time_in/1000,'unixepoch',printf('%+d seconds',$3),'-6 days','weekday 1')) weeks
     FROM attendance a WHERE a.user_id=$2`,
    [Date.now(), uid, off]
  );
  return {
    total: r.total,
    daily: r.days ? Math.floor(r.total / r.days) : 0,
    weekly: r.weeks ? Math.floor(r.total / r.weeks) : 0,
  };
}

export async function isOnDuty(uid: number) {
  const { rowCount } = await query("SELECT 1 FROM attendance WHERE user_id=$1 AND time_out IS NULL LIMIT 1", [uid]);
  return Boolean(rowCount);
}

export async function recentAttendance(uid: number, limit = 5) {
  const { rows } = await query<AttRow>(
    `SELECT a.*, ((COALESCE(a.time_out,$1)-a.time_in)/1000) secs FROM attendance a WHERE a.user_id=$2 ORDER BY a.time_in DESC LIMIT $3`,
    [Date.now(), uid, limit]
  );
  return rows;
}

export async function attendancePage(uid: number, o: { per: number; order: "ASC" | "DESC"; range: Range; page: number }) {
  const since = rangeStart(o.range);
  const { rows: [count] } = await query<{ c: number }>("SELECT COUNT(*) c FROM attendance WHERE user_id=$1 AND time_in >= $2", [uid, since]);
  const total = count.c;
  const pages = Math.max(1, Math.ceil(total / o.per));
  const page = Math.min(Math.max(1, o.page), pages);
  const { rows } = await query<AttRow>(
    `SELECT a.*, ((COALESCE(a.time_out,$1)-a.time_in)/1000) secs FROM attendance a WHERE a.user_id=$2 AND a.time_in >= $3
     ORDER BY a.time_in ${o.order} LIMIT $4 OFFSET $5`,
    [Date.now(), uid, since, o.per, (page - 1) * o.per]
  );
  return { rows, total, pages, page };
}

export async function leaderboard(range: Range) {
  const since = rangeStart(range);
  const { rows } = await query<{ id: number; name: string; course: string | null; photo_ver: number; secs: number }>(
    `SELECT u.id,u.name,u.course,u.photo_ver,
       COALESCE(SUM((COALESCE(a.time_out,$1)-a.time_in)/1000),0) + COALESCE(MAX(adj.seconds),0) secs
     FROM users u LEFT JOIN attendance a ON a.user_id=u.id AND a.time_in >= $2
     LEFT JOIN (SELECT user_id,SUM(seconds) seconds FROM hour_adjustments WHERE created_at >= $2 GROUP BY user_id) adj ON adj.user_id=u.id
     WHERE u.role='student' AND u.active=1 GROUP BY u.id ORDER BY secs DESC LIMIT 50`,
    [Date.now(), since]
  );
  return rows;
}

export async function onDuty() {
  const { rows } = await query<{ id: number; time_in: number; uid: number; name: string; course: string | null; photo_ver: number; secs: number }>(
    `SELECT a.id, a.time_in, u.id uid, u.name, u.course, u.photo_ver, ((COALESCE(a.time_out,$1)-a.time_in)/1000) secs
     FROM attendance a JOIN users u ON u.id=a.user_id WHERE a.time_out IS NULL ORDER BY a.time_in`,
    [Date.now()]
  );
  return rows;
}

export async function adminFilter(f: { user?: number; from: number | null; to: number | null; open?: boolean; limit?: number }) {
  const where: string[] = [];
  const values: number[] = [Date.now()];
  if (f.from != null) (values.push(f.from), where.push(`a.time_in >= $${values.length}`));
  if (f.to != null) (values.push(f.to), where.push(`a.time_in < $${values.length}`));
  if (f.user) (values.push(f.user), where.push(`a.user_id = $${values.length}`));
  if (f.open) where.push("a.time_out IS NULL");
  const sql = `SELECT a.*, u.name, u.school_id, u.photo_ver, ${SECS} secs
    FROM attendance a JOIN users u ON u.id=a.user_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY a.time_in DESC ${f.limit ? "LIMIT " + Number(f.limit) : ""}`;
  const { rows } = await query<AttRowFull>(sql, values);
  return rows;
}
