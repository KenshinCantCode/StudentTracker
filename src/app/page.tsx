"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";
import Avatar from "@/components/Avatar";

const TZ = process.env.NEXT_PUBLIC_TZ_NAME || "Asia/Manila";

type LogRow = { name: string; photo: string | null; in: string; out: string | null; dur: string };
type Msg = { kind: "ok" | "out" | "err"; text: string } | null;

export default function Kiosk() {
  const [now, setNow] = useState<Date | null>(null);
  const [duty, setDuty] = useState<string[]>([]);
  const [log, setLog] = useState<LogRow[]>([]);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const openRef = useRef(open);
  openRef.current = open;

  const feed = useCallback(async (withLog: boolean) => {
    try {
      const j = await (await fetch("/api/feed" + (withLog ? "?log=1" : ""), { cache: "no-store" })).json();
      setDuty(j.duty);
      if (withLog) setLog(j.log);
    } catch {}
  }, []);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    feed(false);
    const f = setInterval(() => feed(openRef.current), 15000);
    return () => (clearInterval(t), clearInterval(f));
  }, [feed]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const school_id = input.current?.value.trim() ?? "";
    if (!school_id || busy) return;
    setBusy(true);
    clearTimeout(timer.current);
    try {
      const r = await fetch("/api/punch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ school_id }) });
      const j = await r.json();
      if (j.ok) {
        setMsg({
          kind: j.action === "in" ? "ok" : "out",
          text: j.action === "in" ? `Welcome, ${j.name}! You are timed IN.` : `Goodbye, ${j.name}! Timed OUT — ${j.duration} rendered.`,
        });
        if (input.current) input.current.value = "";
        feed(openRef.current);
      } else setMsg({ kind: "err", text: j.error });
    } catch {
      setMsg({ kind: "err", text: "Can't reach the server." });
    }
    setBusy(false);
    input.current?.focus();
    timer.current = setTimeout(() => setMsg(null), 5000);
  }

  const msgCls = { ok: "bg-green-900/60 text-green-300", out: "bg-amber-900/50 text-amber-300", err: "bg-red-900/50 text-red-300" };

  return (
    <main className="kiosk-bg flex min-h-screen flex-col items-center justify-center px-6 py-10 text-white">
      <Logo />
      <p className="mb-7 mt-1.5 text-center text-sm text-slate-400">
        Enter your <b className="text-slate-300">School ID Number</b> to punch in/out
      </p>

      <form onSubmit={submit} autoComplete="off" className="w-full max-w-[404px] rounded-2xl bg-panel p-[22px] shadow-2xl shadow-black/50">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-2xl font-extrabold tracking-wider tabular-nums">{now ? now.toLocaleTimeString("en-US", { timeZone: TZ }) : "--:--:--"}</div>
          <div className="text-sm font-semibold text-slate-400">
            {now?.toLocaleDateString("en-US", { timeZone: TZ, weekday: "long", month: "short", day: "numeric" })}
          </div>
        </div>
        <input ref={input} className="dark-field text-center" placeholder="School ID Number" autoFocus required />
        {msg && <div className={`mt-3.5 rounded-lg px-3 py-2.5 text-sm ${msgCls[msg.kind]}`}>{msg.text}</div>}
        <div className="mt-5 flex items-center justify-between">
          <div className="flex gap-4 text-sm text-slate-400">
            <Link href="/login" className="hover:text-white">Login</Link>
            <button type="button" className="hover:text-white" onClick={() => (setOpen(true), feed(true))}>Activities</button>
          </div>
          <button disabled={busy} className="btn">Submit</button>
        </div>
      </form>

      <div className="mt-11 max-w-5xl text-center">
        <small className="mb-2.5 block text-slate-400">On Duty</small>
        {duty.length === 0 && <span className="text-xs text-slate-500">Nobody is on duty right now.</span>}
        {duty.map((n, i) => (
          <span key={i} className="m-[3px] inline-flex items-center gap-1.5 rounded-full border border-[#1e2b45] bg-[#0f1a2e] px-3 py-[5px] text-xs text-slate-300">
            <i className="h-1.5 w-1.5 rounded-full bg-green-500" />
            {n}
          </span>
        ))}
      </div>

      {/* Activities drawer */}
      <div onClick={() => setOpen(false)} className={`fixed inset-0 z-10 bg-black/60 transition ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} />
      <aside className={`fixed right-0 top-0 z-20 h-full w-[min(560px,100%)] overflow-auto bg-[#0b1426] p-6 shadow-[-10px_0_40px_#000a] transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <button onClick={() => setOpen(false)} className="float-right h-[26px] w-[26px] rounded border-2 border-brand leading-none" aria-label="Close">×</button>
        <table className="mt-12 w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-white text-left">
              <th className="py-2.5">Student Name</th><th>Time In</th><th>Time Out</th><th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {log.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-400">No activity yet today.</td></tr>}
            {log.map((x, i) => (
              <tr key={i}>
                <td className="py-2">
                  <div className="flex items-center gap-2.5 font-bold"><Avatar name={x.name} src={x.photo} className="h-9 w-9" rounded="rounded-lg" />{x.name}</div>
                </td>
                <td className="font-mono">{x.in}</td>
                <td className="font-mono">{x.out ?? <span className="rounded bg-green-950 px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-green-400">ACTIVE</span>}</td>
                <td className="font-mono">{x.dur}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </aside>
    </main>
  );
}
