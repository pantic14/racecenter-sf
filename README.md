# Racecenter Peloton

Chrome extension for following Tour de France stages live, complementing the TV broadcast with data you can't see on screen: which riders are in each group, time gaps, km to go, and more.

Click the extension icon and it opens its own full-page app that connects directly to the official live telemetry (Server-Sent Events + REST API) — no servers, no accounts, everything runs and persists locally in your browser.

## Features

- **Group view**: riders split into groups by time gap, updated every second. A new group forms when the gap exceeds a configurable threshold.
- **Rider marking**: click a rider to color them (favorites, GC contenders, sprinters, today's breakaway…), mark whole teams from the jersey bar, or paste comma-separated bib lists per color.
- **Slow-rider detection**: riders below a speed threshold are highlighted (crashes, mechanicals), with optional beep.
- More coming: live stage profile with groups positioned on the altimetry, smart alerts, gap-evolution charts, segment timing with W/kg estimates.

## Install (unpacked)

```bash
npm install
npm run build
```

Then open `chrome://extensions`, enable Developer mode, click **Load unpacked** and select the `dist/` folder. After pulling new code, run `npm run build` again and hit the reload button on the extension.

## Development

```bash
npm run fixtures   # generate synthetic telemetry (once)
npm run dev        # dev server with API proxy and hot reload
```

Open `http://localhost:5173/?mock=1&speed=10` to replay a synthetic race at 10× speed — no live stage needed. During a live stage, plain `http://localhost:5173/` streams real data through the dev proxy.

Stack: Vite + Svelte 5, plain JavaScript. No runtime dependencies.
