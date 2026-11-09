import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";

const COOKIE = "dt_session";
const MAX_AGE = 60 * 60 * 24 * 7;
const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || "dev-only-secret-change-me");

export type SessionUser = {
  id: number;
  school_id: string;
  name: string;
  email: string;
  role: "student" | "admin";
  course: string | null;
  photo_ver: number;
};

export async function createSession(uid: number) {
  const token = await new SignJWT({ uid })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export const getUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const u = db()
      .prepare("SELECT id,school_id,name,email,role,course,photo_ver FROM users WHERE id=? AND active=1")
      .get(Number(payload.uid)) as SessionUser | undefined;
    return u ?? null;
  } catch {
    return null;
  }
});

export async function requireUser() {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/dashboard");
  return u;
}

export const avatarSrc = (u: { id: number; photo_ver: number }) => (u.photo_ver ? `/api/photo/${u.id}?v=${u.photo_ver}` : null);
