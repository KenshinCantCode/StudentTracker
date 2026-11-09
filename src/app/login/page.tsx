"use client";
import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <main className="kiosk-bg flex min-h-screen flex-col items-center justify-center px-6 py-10 text-white">
      <Logo />
      <p className="mb-7 mt-1.5 text-center text-sm text-slate-400">
        <b className="text-slate-300">Sign in</b> to access the dashboard
      </p>
      <form action={action} className="w-full max-w-[404px] rounded-2xl bg-panel p-[22px] shadow-2xl shadow-black/50">
        <label className="mb-1.5 block text-[13px] font-bold">Email or School ID</label>
        <input name="identity" required autoFocus defaultValue={state?.identity ?? ""} key={state?.identity} className="dark-field" />
        <label className="mb-1.5 mt-3.5 block text-[13px] font-bold">Password</label>
        <input name="password" type="password" required className="dark-field" />
        {state?.error && <div className="mt-3.5 rounded-lg bg-red-900/50 px-3 py-2.5 text-sm text-red-300">{state.error}</div>}
        <div className="mt-5 flex items-center justify-between">
          <Link href="/" className="text-sm text-slate-400 hover:text-white">Time In / Out</Link>
          <button disabled={pending} className="btn">{pending ? "Signing in…" : "Login"}</button>
        </div>
      </form>
      <p className="mt-6 text-[13px] text-slate-400">Forgot your password? Ask an admin to reset it.</p>
    </main>
  );
}
