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

## Data

Everything is saved in `localStorage` under `era-data`. Settings → Export gives a JSON backup; Import restores it on any device. Cross-device sync is designed to plug in later as a sync adapter around the same state object.
