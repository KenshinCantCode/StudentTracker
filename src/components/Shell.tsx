import Avatar from "./Avatar";
import { BRAND_A, BRAND_B } from "./Logo";
import { NavLinks, type NavItem } from "./clients";
import { avatarSrc, type SessionUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import Link from "next/link";

export const STUDENT_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "▦", exact: true },
  { href: "/dashboard/leaderboard", label: "Leaderboards", icon: "★" },
  { href: "/dashboard/my-attendance", label: "My Attendance", icon: "☰" },
  { href: "/dashboard/profile", label: "My Profile", icon: "☻" },
];
export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "▦", exact: true },
  { href: "/admin/students", label: "Students", icon: "☻" },
  { href: "/admin/attendance", label: "Attendance", icon: "☰" },
];

export default function Shell({ user, area, children }: { user: SessionUser; area: "student" | "admin"; children: React.ReactNode }) {
  const items = area === "admin" ? ADMIN_NAV : STUDENT_NAV;
  const home = area === "admin" ? "/admin" : "/dashboard";
  const extra: NavItem[] = [
    ...(user.role === "admin" ? [area === "admin" ? { href: "/dashboard", label: "Student view", icon: "⇄", exact: true } : { href: "/admin", label: "Admin panel", icon: "⇄" }] : []),
    { href: "/", label: "Time In / Out", icon: "⏱", exact: true },
  ];
  const src = avatarSrc(user);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[230px] shrink-0 flex-col border-r border-slate-200 px-3.5 py-5 md:flex">
        <Link href={home} className="px-2.5 pb-4 text-[22px] font-extrabold">
          {BRAND_A}
          <span className="text-brand">{BRAND_B}</span>
        </Link>
        {area === "admin" && (
          <div className="mx-2.5 mb-3 self-start rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-brand">Admin Panel</div>
        )}
        <nav className="flex flex-col gap-1">
          <NavLinks items={items} />
          <NavLinks items={extra} />
          <form action={logout}>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              <span className="w-4 text-center">⎋</span>Logout
            </button>
          </form>
        </nav>
        <div className="mt-auto flex items-center gap-2.5 p-2.5">
          <Avatar name={user.name} src={src} />
          <div className="min-w-0 leading-tight">
            <b className="block truncate text-sm">{user.name}</b>
            <small className="text-slate-500">{user.course || user.role}</small>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex h-[58px] items-center justify-between gap-3 px-4 shadow-[0_2px_12px_#0001] md:justify-end md:px-7">
          <span className="text-lg font-extrabold md:hidden">
            {BRAND_A}
            <span className="text-brand">{BRAND_B}</span>
          </span>
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <b className="block text-sm">{user.name}</b>
              <small className="text-xs capitalize text-slate-500">{user.role}</small>
            </div>
            <Avatar name={user.name} src={src} />
          </div>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 py-2 md:hidden">
          <NavLinks items={[...items, ...extra]} mobile />
          <form action={logout} className="shrink-0">
            <button className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600">⎋ Logout</button>
          </form>
        </nav>
        <section className="mx-auto max-w-[1200px] p-4 md:p-6">{children}</section>
      </main>
    </div>
  );
}
