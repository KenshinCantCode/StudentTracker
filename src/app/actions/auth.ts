"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
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

  const { rows: [u] } = await query<{ id: number; password_hash: string; role: string }>(
    "SELECT id,password_hash,role FROM users WHERE (school_id=$1 OR LOWER(email)=LOWER($1)) AND active=1 LIMIT 1", [id]
  );

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
