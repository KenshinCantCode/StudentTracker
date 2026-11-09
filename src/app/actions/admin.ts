"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fromLocalInput } from "@/lib/time";
import { withMsg } from "@/components/Flash";

const S = "/admin/students";
const A = "/admin/attendance";
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => Number(fd.get(k)) || 0;

function dbErr(e: unknown, back: string): never {
  const code = (e as { code?: string })?.code ?? "";
  if (code.startsWith("SQLITE_CONSTRAINT")) redirect(withMsg(back, "That School ID or email is already used.", "err"));
  throw e;
}

/* ---------- Overview ---------- */
export async function forceOut(fd: FormData) {
  await requireAdmin();
  db().prepare("UPDATE attendance SET time_out=? WHERE id=? AND time_out IS NULL").run(Date.now(), num(fd, "id"));
  redirect(withMsg("/admin", "Timed out."));
}
export async function forceAll() {
  await requireAdmin();
  const r = db().prepare("UPDATE attendance SET time_out=? WHERE time_out IS NULL").run(Date.now());
  redirect(withMsg("/admin", `Timed out ${r.changes} student(s).`));
}

/* ---------- Students ---------- */
export async function addUser(fd: FormData) {
  await requireAdmin();
  const sid = str(fd, "school_id"), name = str(fd, "name"), email = str(fd, "email");
  if (!sid || !name || !email) redirect(withMsg(S, "School ID, name and email are required.", "err"));
  const pw = String(fd.get("password") || "") || sid;
  try {
    db()
      .prepare("INSERT INTO users (school_id,name,email,password_hash,role,course,created_at) VALUES (?,?,?,?,?,?,?)")
      .run(sid, name, email, bcrypt.hashSync(pw, 10), fd.get("role") === "admin" ? "admin" : "student", str(fd, "course") || null, Date.now());
  } catch (e) {
    dbErr(e, S);
  }
  redirect(withMsg(S, `Added ${name}. ${fd.get("password") ? "" : "Default password is their School ID."}`));
}

export async function editUser(fd: FormData) {
  const me = await requireAdmin();
  const id = num(fd, "id");
  const role = fd.get("role") === "admin" ? "admin" : "student";
  if (id === me.id && role !== "admin") redirect(withMsg(S, "You can't remove your own admin role.", "err"));
  try {
    db()
      .prepare("UPDATE users SET school_id=?,name=?,email=?,course=?,role=? WHERE id=?")
      .run(str(fd, "school_id"), str(fd, "name"), str(fd, "email"), str(fd, "course") || null, role, id);
  } catch (e) {
    dbErr(e, S);
  }
  redirect(withMsg(S, "Saved."));
}

export async function toggleUser(fd: FormData) {
  const me = await requireAdmin();
  const id = num(fd, "id");
  if (id !== me.id) db().prepare("UPDATE users SET active=1-active WHERE id=?").run(id);
  redirect(withMsg(S, "Status updated."));
}

export async function resetPassword(fd: FormData) {
  await requireAdmin();
  const p = String(fd.get("new") ?? "");
  if (p.length < 6) redirect(withMsg(S, "Password must be at least 6 characters.", "err"));
  db().prepare("UPDATE users SET password_hash=? WHERE id=?").run(bcrypt.hashSync(p, 10), num(fd, "id"));
  redirect(withMsg(S, "Password reset."));
}

export async function deleteUser(fd: FormData) {
  const me = await requireAdmin();
  const id = num(fd, "id");
  if (id !== me.id) db().prepare("DELETE FROM users WHERE id=?").run(id);
  redirect(withMsg(S, "Deleted (their attendance records were removed too)."));
}

/* ---------- Attendance records ---------- */
export async function addRecord(fd: FormData) {
  await requireAdmin();
  const tin = fromLocalInput(str(fd, "time_in"));
  const tout = fromLocalInput(str(fd, "time_out"));
  if (tin == null || (tout != null && tout < tin)) redirect(withMsg(A, "Check the times: time out must be after time in.", "err"));
  db().prepare("INSERT INTO attendance (user_id,time_in,time_out,job) VALUES (?,?,?,?)").run(num(fd, "user_id"), tin, tout, str(fd, "job") || "Duty");
  redirect(withMsg(A, "Record added."));
}

export async function editRecord(fd: FormData) {
  await requireAdmin();
  const tin = fromLocalInput(str(fd, "time_in"));
  const tout = fromLocalInput(str(fd, "time_out"));
  if (tin == null || (tout != null && tout < tin)) redirect(withMsg(A, "Check the times: time out must be after time in.", "err"));
  db().prepare("UPDATE attendance SET time_in=?,time_out=?,job=? WHERE id=?").run(tin, tout, str(fd, "job") || "Duty", num(fd, "id"));
  redirect(withMsg(A, "Record updated."));
}

export async function deleteRecord(fd: FormData) {
  await requireAdmin();
  db().prepare("DELETE FROM attendance WHERE id=?").run(num(fd, "id"));
  redirect(withMsg(A, "Record deleted."));
}
