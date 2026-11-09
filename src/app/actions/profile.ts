"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withMsg } from "@/components/Flash";

const BACK = "/dashboard/profile";

function sniff(b: Buffer): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

export async function uploadPhoto(fd: FormData) {
  const u = await requireUser();
  const f = fd.get("photo");
  if (!(f instanceof File) || f.size === 0) redirect(withMsg(BACK, "Choose an image first.", "err"));
  if (f.size > 2 * 1024 * 1024) redirect(withMsg(BACK, "Image must be under 2 MB.", "err"));
  const buf = Buffer.from(await f.arrayBuffer());
  const mime = sniff(buf);
  if (!mime) redirect(withMsg(BACK, "Use a JPG, PNG or WEBP image.", "err"));
  db().prepare("UPDATE users SET photo=?, photo_mime=?, photo_ver=? WHERE id=?").run(buf, mime, Date.now(), u.id);
  redirect(withMsg(BACK, "Photo updated."));
}

export async function changePassword(fd: FormData) {
  const u = await requireUser();
  const cur = String(fd.get("current") ?? "");
  const next = String(fd.get("new") ?? "");
  const row = db().prepare("SELECT password_hash FROM users WHERE id=?").get(u.id) as { password_hash: string };
  if (!bcrypt.compareSync(cur, row.password_hash)) redirect(withMsg(BACK, "Current password is incorrect.", "err"));
  if (next.length < 8) redirect(withMsg(BACK, "New password must be at least 8 characters.", "err"));
  db().prepare("UPDATE users SET password_hash=? WHERE id=?").run(bcrypt.hashSync(next, 10), u.id);
  redirect(withMsg(BACK, "Password changed."));
}
