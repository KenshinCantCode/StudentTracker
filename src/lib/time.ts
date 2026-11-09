export const TZ = process.env.TZ_NAME || "Asia/Manila";
export const TZ_OFFSET_MIN = Number(process.env.TZ_OFFSET_MIN ?? 480);
const OFF = TZ_OFFSET_MIN * 60000;
const DAY = 86400000;

export type Range = "week" | "month" | "all";
export const RANGES: Record<Range, string> = { week: "This Week", month: "This Month", all: "All Time" };
export const parseRange = (v: unknown): Range => (v === "week" || v === "all" ? v : "month");

export function startOfDay(ms: number) {
  const l = ms + OFF;
  return l - (((l % DAY) + DAY) % DAY) - OFF;
}
export function startOfWeek(ms: number) {
  const sd = startOfDay(ms);
  const dow = (new Date(sd + OFF).getUTCDay() + 6) % 7; // Monday = 0
  return sd - dow * DAY;
}
export function startOfMonth(ms: number) {
  const d = new Date(ms + OFF);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - OFF;
}
export function rangeStart(r: Range, now = Date.now()) {
  return r === "week" ? startOfWeek(now) : r === "month" ? startOfMonth(now) : 0;
}

export function fmtDur(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
export const fmtHours = (sec: number) => (sec / 3600).toFixed(1) + "h";
export const fmtTime = (ms: number | null) =>
  ms == null ? "—" : new Date(ms).toLocaleTimeString("en-US", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
export const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric", year: "numeric" });
export const fmtDateTime = (ms: number) =>
  new Date(ms).toLocaleString("en-US", { timeZone: TZ, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** ms -> "YYYY-MM-DDTHH:mm" in the configured zone (for <input type=datetime-local>) */
export const toLocalInput = (ms: number | null) => (ms == null ? "" : new Date(ms + OFF).toISOString().slice(0, 16));
/** "YYYY-MM-DDTHH:mm" in the configured zone -> ms (null if invalid/empty) */
export function fromLocalInput(v: string | null | undefined) {
  if (!v) return null;
  const t = Date.parse(v.length === 16 ? v + ":00Z" : v + "Z");
  return Number.isNaN(t) ? null : t - OFF;
}
/** "YYYY-MM-DD" (local) -> start-of-day ms */
export function dayStart(v: string) {
  const t = Date.parse(v + "T00:00:00Z");
  return Number.isNaN(t) ? null : t - OFF;
}
export const todayInput = (ms = Date.now()) => new Date(ms + OFF).toISOString().slice(0, 10);
export const monthStartInput = (ms = Date.now()) => new Date(ms + OFF).toISOString().slice(0, 8) + "01";
