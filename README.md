# DutyTrack (Next.js + Tailwind)

Attendance system: ID-number kiosk, student dashboard (stats, leaderboard, history, profile) and an admin panel.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3 · SQLite (`better-sqlite3`) · JWT cookie sessions (`jose`) · `bcryptjs`

## Run it

```bash
npm install
cp .env.example .env.local     # then edit SESSION_SECRET (and ADMIN_PASSWORD if you like)
npm run build
npm start                      # http://localhost:8080  (also reachable on your LAN IP)
```

For development use `npm run dev`.

On first start it creates the database at `data/attendance.db` and an admin account:
**School ID `ADMIN` / password `admin123`** (or whatever you set in `ADMIN_PASSWORD`). Change it under *My Profile* after logging in.

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
| `/admin/students` | admins | Add / edit / disable / delete accounts, reset passwords |
| `/admin/attendance` | admins | Filter, edit, delete, add manual records, export CSV |

## Configuration (`.env.local`)

| Variable | Meaning |
|---|---|
| `SESSION_SECRET` | Long random string used to sign login cookies. **Set this.** |
| `ADMIN_PASSWORD` | Password for the auto-created admin (first run only) |
| `NEXT_PUBLIC_BRAND_A` / `_B` | Logo text (white part / blue part) |
| `TZ_NAME`, `TZ_OFFSET_MIN`, `NEXT_PUBLIC_TZ_NAME` | Time zone (default Asia/Manila, UTC+8). Keep the three consistent. |
| `DATABASE_FILE` | Path to the SQLite file (default `./data/attendance.db`) |
| `COOKIE_SECURE` | Set to `true` once you serve over HTTPS |

## Hosting notes

- SQLite is a file, so the app needs a server with a **persistent disk**: a school PC or server on your LAN, a VPS, or Render/Railway/Fly with a volume. Back up `data/attendance.db` regularly.
- It will **not** keep data on serverless hosts like Vercel (the disk is wiped between requests). If you want Vercel, swap `src/lib/db.ts` for a hosted database (Turso, Neon/Postgres, PlanetScale); all queries live in `src/lib/queries.ts` and `src/app/actions/`.
- New students get their School ID as their password unless the admin sets one. Ask them to change it.
- Repeat scans within 30 seconds are ignored.
- Use HTTPS if this is reachable outside your LAN.

## Project layout

```
src/app/            pages, API routes (punch, feed, photo, admin export) and server actions
src/components/     Shell (sidebar/topbar), Avatar, Logo, small client helpers
src/lib/            db (schema + first-run admin), auth (JWT session), queries, time helpers
scripts/seed-demo.mjs
```
