# DutyTrack (Next.js + Tailwind)

Attendance system with an ID-number kiosk, student dashboard, and admin panel. It uses a local SQLite database and can be accessed by devices on the same trusted local network.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3 · SQLite (`node:sqlite`) · JWT cookie sessions (`jose`) · `bcryptjs`

## Requirements

- Node.js 22.5 or later (the built-in SQLite module is used)
- npm

## Run on a local network

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set unique, private values for `SESSION_SECRET` and `ADMIN_PASSWORD` before the first run. The first admin's School ID is `ADMIN`.
4. Run `npm run dev` for development or `npm run build` followed by `npm start` for normal use.
5. On the host computer, open `http://localhost:8080`. Other devices on the same network can open `http://<host-LAN-IP>:8080`.
6. If other devices cannot connect, allow Node.js or inbound TCP port 8080 on the host's **Private** Windows Firewall profile. Do not expose this port to public networks.

The app listens on `0.0.0.0:8080`. Local HTTP is not encrypted, so use a trusted private network only. `COOKIE_SECURE=false` is required for HTTP; use HTTPS and set it to `true` if you later add TLS.

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
| `SESSION_SECRET` | Long random string used to sign login cookies. Set a unique secret. |
| `ADMIN_PASSWORD` | Password for the automatically created admin (first run only) |
| `SQLITE_PATH` | SQLite file path; defaults to `data/dutytrack.sqlite` |
| `NEXT_PUBLIC_BRAND_A` / `_B` | Logo text (white part / blue part) |
| `TZ_NAME`, `TZ_OFFSET_MIN`, `NEXT_PUBLIC_TZ_NAME` | Time zone (default Asia/Manila, UTC+8). Keep the three consistent. |
| `COOKIE_SECURE` | Keep `false` for local HTTP; set `true` only for HTTPS |

The SQLite file is created automatically. Back it up by stopping the app and copying the database file and its SQLite WAL/SHM sidecars if present. Keep the database on the host computer's local disk, not a network share. A new local database starts with an admin account and no previous users or attendance records; the previous remote database is not changed.

## Hosting notes

- New students get their School ID as their password unless the admin sets one. Ask them to change it.
- Repeat scans within 30 seconds are ignored.
- Hour additions/removals are stored as a signed ledger entry with admin, reason, and timestamp. A removal cannot exceed the student's current total.
- Keep the host computer running while students use the site. This is a local-network app, not a Vercel/Supabase deployment.

## Project layout

```
src/app/            pages, API routes (punch, feed, photo, admin export) and server actions
src/components/     Shell (sidebar/topbar), Avatar, Logo, small client helpers
src/lib/            SQLite connection/schema + first-run admin, auth, queries, time helpers
```
