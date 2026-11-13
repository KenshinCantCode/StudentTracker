"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { withMsg } from "@/components/Flash";

const BACK = "/dashboard/profile";

function sniff(b: Buffer): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (b.subarray(0, 6).toString() === "GIF87a" || b.subarray(0, 6).toString() === "GIF89a") return "image/gif";
  return null;
}

export async function uploadPhoto(fd: FormData) {
  const u = await requireUser();
  const f = fd.get("photo");
  if (!(f instanceof File) || f.size === 0) redirect(withMsg(BACK, "Choose an image first.", "err"));
  if (f.size > 2 * 1024 * 1024) redirect(withMsg(BACK, "Image must be under 2 MB.", "err"));
  const buf = Buffer.from(await f.arrayBuffer());
  const mime = sniff(buf);
  if (!mime) redirect(withMsg(BACK, "Use a JPG, PNG, WEBP or GIF image.", "err"));
  await query("UPDATE users SET photo=$1, photo_mime=$2, photo_ver=$3 WHERE id=$4", [buf, mime, Date.now(), u.id]);
  redirect(withMsg(BACK, "Photo updated."));
}

export async function changePassword(fd: FormData) {
  const u = await requireUser();
  const cur = String(fd.get("current") ?? "");
  const next = String(fd.get("new") ?? "");
  const { rows: [row] } = await query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id=$1", [u.id]);
  if (!bcrypt.compareSync(cur, row.password_hash)) redirect(withMsg(BACK, "Current password is incorrect.", "err"));
  if (next.length < 8) redirect(withMsg(BACK, "New password must be at least 8 characters.", "err"));
  await query("UPDATE users SET password_hash=$1 WHERE id=$2", [bcrypt.hashSync(next, 10), u.id]);
  redirect(withMsg(BACK, "Password changed."));
}
