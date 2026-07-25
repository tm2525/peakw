# Peak Window

An ADHD day planner that schedules everything around your stimulant pharmacokinetics instead of the clock.

Single-file app — no build step, no dependencies to install. React via CDN, JSX compiled in-browser by Babel standalone. All data stays on your device in `localStorage`.

## Features

- **Effect curve** — models long-acting lisdexamfetamine (onset ~1.5–2h, peak ~4h, tail to ~12h) plus optional prescribed 10mg short-acting boosters (one at ~12:45pm, or two at 11am + 2pm), drawn as a live SVG with a "now" marker.
- **Sleep guardrails** — hard warnings when any booster timing would still be active at bedtime, and a spacing warning when two boosters overlap.
- **Auto-built schedule** keyed off dose time, with three day types: Study, Clinical/theatre, Recovery/post-call.
- **Fuel timing** woven in — eat-by-the-clock meals and snacks placed to protect concentration through appetite suppression and the comedown.
- **Top 3 + task list** — tasks tagged 🧠 Deep or 🍃 Light; the "Right now" card surfaces only the tasks that fit the current block on the curve.
- **Focus check-ins & insights** — 1-tap 1–5 ratings build your *actual* focus curve vs the textbook model, with SOS presses overlaid.
- **Focus SOS** — curve-stage-aware advice, a 5-step reset protocol, and a one-card-at-a-time tactic dealer.
- **Focus gym** — trainable attention exercises with built-in timers.
- **Snack Patrol** — boredom-vs-hunger triage, craving-matched low-calorie snacks, daily kcal budget.
- **50/10 pomodoro** with chimes at phase ends and block transitions (toggleable).

## Run locally

Open `index.html` in a browser. That's it.

## Deploy on GitHub Pages (step by step)

1. Create a new **public** repository on GitHub.
2. Upload the **files themselves** (`index.html`, `README.md`, `.nojekyll`) to the repo root — not the containing folder. After uploading, `index.html` must be visible on the repo's front page, not inside a subfolder.
3. **Settings → Pages** → Build and deployment → Source: **Deploy from a branch** → Branch: `main`, Folder: `/ (root)` → Save.
4. Wait 1–5 minutes (watch the **Actions** tab for the "pages build and deployment" job to go green).
5. Open `https://<username>.github.io/<repo-name>/` — note the repo name and trailing slash. Hard-refresh (Cmd/Ctrl+Shift+R) if you saw a 404 earlier; browsers cache it.

If the page loads but shows an error box, a script/ad blocker is blocking `cdn.jsdelivr.net` — allow it and refresh.

## Install on iPhone (basic)

Open the GitHub Pages URL in Safari → Share → **Add to Home Screen**. For a full PWA (offline support, real notifications), add a manifest + service worker — the app is structured to make that straightforward.

## Data & privacy

Everything (settings, daily logs, task list, focus history) lives in your browser's `localStorage` under `pw:*` keys. Nothing leaves your device. Clearing site data resets the app.

## Disclaimer

Planning aid only — not medical advice. Medication doses and timing belong to you and your prescriber; the app deliberately models a single daily long-acting dose plus short-acting boosters **only if prescribed**, and warns when timing would threaten sleep.
