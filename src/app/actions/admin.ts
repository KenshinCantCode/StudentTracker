"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { query, transaction } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fromLocalInput } from "@/lib/time";
import { withMsg } from "@/components/Flash";

const S = "/admin/students";
const A = "/admin/attendance";
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => Number(fd.get(k)) || 0;

function dbErr(e: unknown, back: string): never {
  const code = (e as { code?: string })?.code ?? "";
  if (code === "23505" || code === "ERR_SQLITE_CONSTRAINT_UNIQUE") redirect(withMsg(back, "That School ID or email is already used.", "err"));
  throw e;
}

/* ---------- Overview ---------- */
export async function forceOut(fd: FormData) {
  await requireAdmin();
  await query("UPDATE attendance SET time_out=$1 WHERE id=$2 AND time_out IS NULL", [Date.now(), num(fd, "id")]);
  redirect(withMsg("/admin", "Timed out."));
}
export async function forceAll() {
  await requireAdmin();
  const { rowCount } = await query("UPDATE attendance SET time_out=$1 WHERE time_out IS NULL", [Date.now()]);
  redirect(withMsg("/admin", `Timed out ${rowCount} student(s).`));
}

/* ---------- Students ---------- */
export async function addUser(fd: FormData) {
  await requireAdmin();
  const sid = str(fd, "school_id"), name = str(fd, "name"), email = str(fd, "email");
  if (!sid || !name || !email) redirect(withMsg(S, "School ID, name and email are required.", "err"));
  const pw = String(fd.get("password") || "") || sid;
  try {
    await query("INSERT INTO users (school_id,name,email,password_hash,role,course,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [sid, name, email, bcrypt.hashSync(pw, 10), fd.get("role") === "admin" ? "admin" : "student", str(fd, "course") || null, Date.now()]);
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
    await query("UPDATE users SET school_id=$1,name=$2,email=$3,course=$4,role=$5 WHERE id=$6",
      [str(fd, "school_id"), str(fd, "name"), str(fd, "email"), str(fd, "course") || null, role, id]);
  } catch (e) {
    dbErr(e, S);
  }
  redirect(withMsg(S, "Saved."));
}

export async function toggleUser(fd: FormData) {
  const me = await requireAdmin();
  const id = num(fd, "id");
  if (id !== me.id) await query("UPDATE users SET active=CASE WHEN active=1 THEN 0 ELSE 1 END WHERE id=$1", [id]);
  redirect(withMsg(S, "Status updated."));
}

export async function resetPassword(fd: FormData) {
  await requireAdmin();
  const p = String(fd.get("new") ?? "");
  if (p.length < 6) redirect(withMsg(S, "Password must be at least 6 characters.", "err"));
  await query("UPDATE users SET password_hash=$1 WHERE id=$2", [bcrypt.hashSync(p, 10), num(fd, "id")]);
  redirect(withMsg(S, "Password reset."));
}

export async function deleteUser(fd: FormData) {
  const me = await requireAdmin();
  const id = num(fd, "id");
  if (id !== me.id) await query("DELETE FROM users WHERE id=$1", [id]);
  redirect(withMsg(S, "Deleted (their attendance records were removed too)."));
}

/* ---------- Attendance records ---------- */
export async function addRecord(fd: FormData) {
  await requireAdmin();
  const tin = fromLocalInput(str(fd, "time_in"));
  const tout = fromLocalInput(str(fd, "time_out"));
  if (tin == null || (tout != null && tout < tin)) redirect(withMsg(A, "Check the times: time out must be after time in.", "err"));
  await query("INSERT INTO attendance (user_id,time_in,time_out,job) VALUES ($1,$2,$3,$4)", [num(fd, "user_id"), tin, tout, str(fd, "job") || "Duty"]);
  redirect(withMsg(A, "Record added."));
}

export async function editRecord(fd: FormData) {
  await requireAdmin();
  const tin = fromLocalInput(str(fd, "time_in"));
  const tout = fromLocalInput(str(fd, "time_out"));
  if (tin == null || (tout != null && tout < tin)) redirect(withMsg(A, "Check the times: time out must be after time in.", "err"));
  await query("UPDATE attendance SET time_in=$1,time_out=$2,job=$3 WHERE id=$4", [tin, tout, str(fd, "job") || "Duty", num(fd, "id")]);
  redirect(withMsg(A, "Record updated."));
}

export async function deleteRecord(fd: FormData) {
  await requireAdmin();
  await query("DELETE FROM attendance WHERE id=$1", [num(fd, "id")]);
  redirect(withMsg(A, "Record deleted."));
}

export async function adjustHours(fd: FormData) {
  const admin = await requireAdmin();
  const userId = num(fd, "user_id");
  const hours = Number(fd.get("hours"));
  const reason = str(fd, "reason");
  const direction = str(fd, "direction");
  const back = `${S}?hours=${userId}`;
  if (userId <= 0 || !Number.isFinite(hours) || hours <= 0 || hours > 1000 || !reason || reason.length > 240 || !["add", "remove"].includes(direction)) {
    redirect(withMsg(back, "Enter a valid amount (up to 1,000 hours) and a reason.", "err"));
  }
  const seconds = Math.round(hours * 3600) * (direction === "remove" ? -1 : 1);
  try {
    await transaction(async (client) => {
      const { rows: [student] } = await client.query("SELECT id,role FROM users WHERE id=$1", [userId]);
      if (!student || student.role !== "student") throw new Error("STUDENT_NOT_FOUND");
      if (seconds < 0) {
        const { rows: [balance] } = await client.query(
          `SELECT COALESCE((SELECT SUM(COALESCE(time_out,$1)-time_in) FROM attendance WHERE user_id=$2),0)
             + COALESCE((SELECT SUM(seconds*1000) FROM hour_adjustments WHERE user_id=$2),0) total`,
          [Date.now(), userId]
        );
        if (Number(balance.total) + seconds * 1000 < 0) throw new Error("INSUFFICIENT_HOURS");
      }
      await client.query(
        "INSERT INTO hour_adjustments (user_id,admin_id,seconds,reason,created_at) VALUES ($1,$2,$3,$4,$5)",
        [userId, admin.id, seconds, reason, Date.now()]
      );
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_HOURS") {
      redirect(withMsg(back, "Cannot remove more hours than the student currently has.", "err"));
    }
    if (error instanceof Error && error.message === "STUDENT_NOT_FOUND") redirect(withMsg(back, "Student account not found.", "err"));
    throw error;
  }
  redirect(withMsg(back, `${direction === "add" ? "Added" : "Removed"} ${hours} hour(s).`));
}
