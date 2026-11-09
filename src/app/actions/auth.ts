"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";

// Simple in-memory brute-force guard: 5 failures per ID => 5 minute lockout.
const fails = new Map<string, { n: number; until: number }>();

export type LoginState = { error?: string; identity?: string } | undefined;

export async function login(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const id = String(fd.get("identity") ?? "").trim();
  const pw = String(fd.get("password") ?? "");
  if (!id || !pw) return { error: "Enter your ID/email and password.", identity: id };

  const key = id.toLowerCase();
  const f = fails.get(key);
  if (f && f.until > Date.now()) return { error: "Too many attempts. Try again in a few minutes.", identity: id };

  const u = db()
    .prepare("SELECT id,password_hash,role FROM users WHERE (school_id=@id OR email=@id) AND active=1")
    .get({ id }) as { id: number; password_hash: string; role: string } | undefined;

  if (!u || !bcrypt.compareSync(pw, u.password_hash)) {
    const n = (f?.n ?? 0) + 1;
    fails.set(key, { n, until: n >= 5 ? Date.now() + 5 * 60_000 : 0 });
    return { error: "Invalid credentials.", identity: id };
  }
  fails.delete(key);
  await createSession(u.id);
  redirect(u.role === "admin" ? "/admin" : "/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
