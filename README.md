# The 90-Day Era

*Your journey. Your rules. Your glow-up.*

A personal 90-day fitness RPG built around a fixed treadmill workout (incline 12 · 3 mph · 30 min) and a rotating 12-hour shift schedule. React + Vite + Tailwind, installable as a PWA, all data stored locally in the browser with export/import.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. `npm test` runs the XP / streak / date logic tests. `npm run build` produces `dist/`.

## Deploy to Render (free static site)

1. Push this folder to a GitHub repository.
2. In Render: **New +** → **Blueprint** → pick the repo → **Apply**. `render.yaml` does the rest.
3. Every push to the default branch redeploys.

## Where things live

| Path | What |
|---|---|
| `src/content/` | All editable content: quests, bosses, badges, themes, envelopes, wheel, quotes, rewards, chapters |
| `src/lib/xp.ts` | XP values and level thresholds |
| `src/lib/stats.ts` | Derived stats: streaks, totals, weekly breakdowns |
| `src/store/useStore.ts` | Persisted state and every action (idempotent XP ledger) |
| `src/pages/` | One file per screen |

## Data and sync

Everything is saved in `localStorage` under `era-data`, so the app works offline and without an account. Settings → Export gives a JSON backup; Import restores it on any device.

Optional cloud sync uses Supabase with email and password sign-in:

1. Run `supabase/schema.sql` once in the Supabase SQL Editor.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`) in `.env.local` for local use and in the Render service's Environment tab for the live site.
3. In Supabase → Authentication → URL Configuration, set the Site URL to the live address.
4. In Supabase → Authentication → Emails, change the "Confirm signup" and "Reset password" templates to show `{{ .Token }}`. The app confirms sign-ups and resets passwords with an emailed code, not a link.

Each account has one row holding the whole saved state plus a version number. A device uploads only if the cloud version is the one it last saw; if both sides changed, the app asks which copy to keep and backs up the other.
