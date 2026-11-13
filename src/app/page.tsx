"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";
import Avatar from "@/components/Avatar";

const TZ = process.env.NEXT_PUBLIC_TZ_NAME || "Asia/Manila";

type LogRow = { name: string; photo: string | null; in: string; out: string | null; dur: string };
type PunchMessage = {
  id: number;
  kind: "in" | "out" | "err";
  name?: string;
  photo?: string | null;
  detail: string;
  visible: boolean;
};

export default function Kiosk() {
  const [now, setNow] = useState<Date | null>(null);
  const [duty, setDuty] = useState<string[]>([]);
  const [log, setLog] = useState<LogRow[]>([]);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<PunchMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageId = useRef(0);
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
    return () => {
      clearInterval(t);
      clearInterval(f);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [feed]);

  function dismissMessage() {
    if (timer.current) clearTimeout(timer.current);
    setMsg((current) => current ? { ...current, visible: false } : null);
    timer.current = setTimeout(() => setMsg(null), 240);
  }

  function announce(message: Omit<PunchMessage, "id" | "visible">) {
    if (timer.current) clearTimeout(timer.current);
    setMsg({ ...message, id: ++messageId.current, visible: true });
    timer.current = setTimeout(() => {
      setMsg((current) => current ? { ...current, visible: false } : null);
      timer.current = setTimeout(() => setMsg(null), 240);
    }, 4700);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const school_id = input.current?.value.trim() ?? "";
    if (!school_id || busy) return;
    setBusy(true);
    if (timer.current) clearTimeout(timer.current);
    try {
      const r = await fetch("/api/punch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ school_id }) });
      const j = await r.json();
      if (j.ok) {
        announce({
          kind: j.action === "in" ? "in" : "out",
          name: j.name,
          photo: j.photo,
          detail: j.action === "in" ? "Clocked in successfully." : `Clocked out after ${j.duration}.`,
        });
        if (input.current) input.current.value = "";
        feed(openRef.current);
      } else announce({ kind: "err", detail: j.error });
    } catch {
      announce({ kind: "err", detail: "Can't reach the server." });
    }
    setBusy(false);
    input.current?.focus();
  }

  const toastColors = {
    in: "border-emerald-300/30 bg-[#102c2b]/95",
    out: "border-sky-300/30 bg-[#14263a]/95",
    err: "border-rose-300/30 bg-[#351d2a]/95",
  };

  return (
    <main className="kiosk-bg flex min-h-screen flex-col items-center justify-center px-6 py-10 text-white">
      {msg && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-6">
          <div
            key={msg.id}
            role={msg.kind === "err" ? "alert" : "status"}
            aria-live={msg.kind === "err" ? "assertive" : "polite"}
            aria-atomic="true"
            className={`punch-toast pointer-events-auto flex w-full max-w-md items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left shadow-2xl shadow-black/40 backdrop-blur-xl ${toastColors[msg.kind]} ${msg.visible ? "punch-toast-enter" : "punch-toast-exit"}`}
          >
            {msg.kind === "err" ? (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-300/15 text-xl font-bold text-rose-200" aria-hidden="true">!</span>
            ) : (
              <Avatar name={msg.name ?? ""} src={msg.photo} className="h-12 w-12 border-2 border-white/15" />
            )}
            <div className="min-w-0 flex-1">
              {msg.kind === "err" ? (
                <>
                  <p className="font-bold text-rose-100">Punch not completed</p>
                  <p className="mt-0.5 text-sm leading-snug text-rose-100/80">{msg.detail}</p>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="truncate font-bold text-white">{msg.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-wider ${msg.kind === "in" ? "bg-emerald-300/15 text-emerald-200" : "bg-sky-300/15 text-sky-100"}`}>
                      {msg.kind === "in" ? "CLOCKED IN" : "CLOCKED OUT"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm leading-snug text-slate-200">{msg.detail}</p>
                </>
              )}
            </div>
            <button type="button" onClick={dismissMessage} aria-label="Dismiss notification" className="ml-1 shrink-0 self-start rounded-md px-1.5 text-xl leading-none text-slate-300 transition hover:bg-white/10 hover:text-white">×</button>
          </div>
        </div>
      )}
      <Logo />
      <p className="mb-7 mt-1.5 text-center text-sm text-slate-300">
        Enter your <b className="text-white">School ID Number</b> to punch in/out
      </p>

      <form onSubmit={submit} autoComplete="off" className="w-full max-w-[404px] rounded-2xl border border-white/10 bg-panel p-[22px] shadow-2xl shadow-black/40">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-2xl font-extrabold tracking-wider tabular-nums">{now ? now.toLocaleTimeString("en-US", { timeZone: TZ }) : "--:--:--"}</div>
          <div className="text-sm font-semibold text-slate-300">
            {now?.toLocaleDateString("en-US", { timeZone: TZ, weekday: "long", month: "short", day: "numeric" })}
          </div>
        </div>
        <input ref={input} className="dark-field text-center" placeholder="School ID Number" autoFocus required />
        <div className="mt-5 flex items-center justify-between">
          <div className="flex gap-4 text-sm text-slate-300">
            <Link href="/login" className="transition-colors hover:text-white">Login</Link>
            <button type="button" className="transition-colors hover:text-white" onClick={() => (setOpen(true), feed(true))}>Activities</button>
          </div>
          <button disabled={busy} className="btn transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0">{busy ? "Submitting..." : "Submit"}</button>
        </div>
      </form>

      <div className="mt-11 max-w-5xl text-center">
        <small className="mb-2.5 block text-slate-300">On Duty</small>
        {duty.length === 0 && <span className="text-xs text-slate-400">Nobody is on duty right now.</span>}
        {duty.map((n, i) => (
          <span key={i} className="m-[3px] inline-flex items-center gap-1.5 rounded-full border border-sky-100/15 bg-slate-900/60 px-3 py-[5px] text-xs text-slate-100">
            <i className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {n}
          </span>
        ))}
      </div>

      {/* Activities drawer */}
      <div onClick={() => setOpen(false)} className={`fixed inset-0 z-10 bg-black/60 transition ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} />
      <aside className={`fixed right-0 top-0 z-20 h-full w-[min(560px,100%)] overflow-auto border-l border-white/10 bg-[#0d1a2d] p-6 shadow-[-10px_0_40px_#000a] transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}>
        <button onClick={() => setOpen(false)} className="float-right h-[26px] w-[26px] rounded border-2 border-brand leading-none" aria-label="Close">×</button>
        <table className="mt-12 w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-slate-500/60 text-left">
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
