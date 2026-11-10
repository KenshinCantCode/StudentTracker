# DutyTrack (Next.js + Tailwind)

Attendance system: ID-number kiosk, student dashboard (stats, leaderboard, history, profile) and an admin panel.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3 · Supabase PostgreSQL · JWT cookie sessions (`jose`) · `bcryptjs`

## Run it

```bash
npm install
cp .env.example .env.local     # set DATABASE_URL, SESSION_SECRET, and ADMIN_PASSWORD
npm run build
npm start                      # http://localhost:8080  (also reachable on your LAN IP)
```

For development use `npm run dev`.

On first start it creates the PostgreSQL tables and an admin account with School ID `ADMIN` and the password from `ADMIN_PASSWORD`. Set a strong password before first start, then change it under *My Profile* after logging in.

Optional: `npm run seed:demo` (stop the app first) adds 10 demo students with a few weeks of attendance so you can see the dashboards filled in. Demo password: `student123`.

## Pages

| Route | Who | What |
|---|---|---|
| `/` | everyone | Kiosk: enter School ID to time in/out, "On Duty" chips, Activities drawer (today's log) |
| `/login` | everyone | Sign in with School ID or email |
| `/dashboard` | students | Total / daily / weekly averages, recent activity |
| `/dashboard/leaderboard` | students | Podium + ranking (week / month / all time) |
| `/dashboard/my-attendance` | students | Filterable, paged history |
| `/dashboard/profile` | students | Stats, profile photo upload, change password |
| `/admin` | admins | Live on-duty list, force time-out, "forgot to time out" warning |
| `/admin/students` | admins | Add / edit / disable / delete accounts, reset passwords, add/remove student hours |
| `/admin/attendance` | admins | Filter, edit, delete, add manual records, export CSV |

## Configuration (`.env.local`)

| Variable | Meaning |
|---|---|
| `SESSION_SECRET` | Long random string used to sign login cookies. **Set this.** |
| `ADMIN_PASSWORD` | Password for the auto-created admin (first run only) |
| `DATABASE_URL` | Supabase PostgreSQL connection string; use the transaction pooler on port `6543` for Vercel |
| `NEXT_PUBLIC_BRAND_A` / `_B` | Logo text (white part / blue part) |
| `TZ_NAME`, `TZ_OFFSET_MIN`, `NEXT_PUBLIC_TZ_NAME` | Time zone (default Asia/Manila, UTC+8). Keep the three consistent. |
| `COOKIE_SECURE` | Set to `true` once you serve over HTTPS |

## Deploy to Vercel + Supabase

1. Create a Supabase project and open **Project Settings → Database**. Copy the **Transaction pooler** connection string (port `6543`), replace its password placeholder, and URL-encode special characters in the password. Keep the `pgbouncer=true` query parameter.
2. Push this repository to GitHub and import it into Vercel. The default Next.js build settings are sufficient.
3. In **Vercel → Project Settings → Environment Variables**, add `DATABASE_URL`, a long random `SESSION_SECRET`, `ADMIN_PASSWORD`, `COOKIE_SECURE=true`, and the `TZ_NAME`, `TZ_OFFSET_MIN`, and `NEXT_PUBLIC_TZ_NAME` values used by the school.
4. Deploy. The app creates its tables and first admin account on its first database request. Sign in with School ID `ADMIN` and the configured `ADMIN_PASSWORD`, then change the password.
5. In Supabase, enable automated backups appropriate to your plan. Do not expose the database URL or any database password as a `NEXT_PUBLIC_` variable.

Existing SQLite data is not copied automatically; a fresh Supabase database starts empty except for the initial admin. Export/transform existing student and attendance data before switching production traffic.

## Hosting notes

- New students get their School ID as their password unless the admin sets one. Ask them to change it.
- Repeat scans within 30 seconds are ignored.
- Hour additions/removals are stored as a signed ledger entry with admin, reason, and timestamp. A removal cannot exceed the student's current total.

## Project layout

```
src/app/            pages, API routes (punch, feed, photo, admin export) and server actions
src/components/     Shell (sidebar/topbar), Avatar, Logo, small client helpers
src/lib/            PostgreSQL connection/schema + first-run admin, auth, queries, time helpers
scripts/seed-demo.mjs
```
