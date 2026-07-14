# Racecenter — promo teaser (Remotion)

A ~21s promo for the Racecenter Chrome extension, built with
[Remotion](https://remotion.dev) (video-as-React). The UI panels are recreated
in HTML/CSS from the real extension components, so the look matches the app 1:1
(same palette from `src/lib/colors.js`, same layouts).

## Scenes

| # | Scene | What it shows |
|---|-------|---------------|
| 1 | Intro | `Racecenter` wordmark reveal + tagline |
| 2 | Live feed | Groups populating (Head of race / Chasers / Peloton), rider chips, live gaps |
| 3 | Climb | A group header with VAM / gradient / wind ticking up on a ramp |
| 4 | Replay | Purple replay bar with the scrubber advancing and the stage clock counting |
| 5 | Outro | Wordmark + "Añádelo a Chrome" CTA |

Marketing copy for the promos is in English — edit the `Callout` lines in
`src/scenes/*.tsx` (and `src/scenes/v/*.tsx` for vertical). The **commentator
pitch is bilingual**: all its wording (ES + EN) lives in one dictionary,
`src/copy.ts`; its scenes are in `src/scenes/c/`. The extension UI labels stay
English (as in the real app).

## Two compositions

| Composition ID | Size | Use |
|----------------|------|-----|
| `Promo` | 1920×1080 (16:9) | YouTube, web embed, landing page |
| `PromoVertical` | 1080×1920 (9:16) | YouTube Shorts, Reels, TikTok, Stories |
| `PromoShortHook` | 1080×1920 (9:16) | Hook-first Short **with music** — opens on the live feed (no title card), brand + CTA at the end |
| `CommentatorsES` / `CommentatorsEN` | 1920×1080 (16:9) | ~49s explainer pitch aimed at **TV commentators**, with soft music. Same composition, `lang` prop = `es`/`en` |

The vertical versions stack callout-over-panel and their outro shows a
"Link's in the description 👇" card, leaving the lower third clear for the
Shorts title/description overlay. Vertical scenes live in `src/scenes/v/`.

### Music

`PromoShortHook` plays `public/music.wav` and the commentator pitch plays
`public/music-soft.wav` — both **original, royalty-free** beds synthesized by
`tools/make-music.mjs` (no copyright-claim risk on YouTube). The soft variant
(slower, no hats, warm pad) is generated with `npm run music:soft`. Regenerate
the energetic one with `npm run music`, or drop in your own track:

```bash
# replace with any licensed/royalty-free file, keep the name (or edit the
# staticFile() call in src/PromoShortHook.tsx)
cp your-track.mp3 public/music.mp3
```

Volume/fades live in the `MusicBed` component in `src/PromoShortHook.tsx`.

## Run it

> Rendering and the Studio preview both use headless Chrome. On this WSL2 box the
> sandbox kills headless Chrome, so run these in your own terminal (or with the
> sandbox disabled), not inside Claude's sandboxed shell.

```bash
cd video
npm install

# live preview / edit in the browser
npm run studio

# render the 16:9 promo → out/racecenter-promo.mp4 (1920x1080, 30fps, H.264)
npm run render

# render the 9:16 vertical Short → out/racecenter-short-9x16.mp4 (1080x1920)
npm run render:short

# render the hook-first Short WITH MUSIC → out/racecenter-short-hook-music.mp4
npm run render:hook

# render the commentator pitch (16:9, soft music), Spanish and English
npm run render:commentators-es
npm run render:commentators-en

# social/web-friendly webm
npm run render:webm

# a single poster frame (out/poster.png)
npm run still
```

First render downloads a Chromium build (~1 min, one-off).

## Tune

- Timing / scene order: `src/Promo.tsx` (`SCENES` array + `OVERLAP`).
- Sample riders & teams: `src/data.ts`.
- Colors: `src/theme.ts` (mirrors the app palette).
- Format/quality: `remotion.config.ts` (CRF, codec).
