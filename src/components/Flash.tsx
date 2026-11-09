export type SP = Record<string, string | string[] | undefined>;
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Reads ?msg=...&t=ok|err from searchParams */
export default function Flash({ sp }: { sp: SP }) {
  const msg = one(sp.msg);
  if (!msg) return null;
  const err = one(sp.t) === "err";
  return (
    <div className={`mb-4 rounded-lg px-4 py-2.5 text-sm ${err ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>{msg}</div>
  );
}

export const withMsg = (path: string, msg: string, t: "ok" | "err" = "ok") =>
  `${path}${path.includes("?") ? "&" : "?"}msg=${encodeURIComponent(msg)}&t=${t}`;
