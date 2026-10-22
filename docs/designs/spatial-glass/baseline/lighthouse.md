# Lighthouse baseline (pre-redesign)

Mobile Lighthouse, Performance and Accessibility, for the app as of commit `45db05b`
(before any spatial-glass work). Measured 2026-10-22 on gmk1.

## Conditions

- Production build (`next build && next start`) on 127.0.0.1:3200, running against the mtg-mock
  Supabase and TMDB mock (`~/tools/mtg-mock` on gmk1), signed in as the fixture user.
- Lighthouse 13.5.0 through `run.sh lighthouse`. That runs `lh.mjs`, which sets the session as real
  browser cookies so the client-side Supabase client is signed in too.
- Default mobile settings: 412x823 at DPR 1.75, simulated throttling (150 ms RTT, 1.6 Mbps,
  4x CPU slowdown).
- Browser: Playwright's chrome-headless-shell 156.0.8078.4.
- Host: Intel N150. Benchmark index 2100 to 2300 on clean runs.
- Data comes from the mock fixtures (the reference home page's library). Posters come from the
  local mock through `/_next/image`, so image transfer is local. Google Fonts (Outfit) still
  load from the internet.

Three runs per route. The table shows the median run; the full list is below it.

| Route | Performance | Accessibility | FCP | LCP | TBT | CLS | Speed Index |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 94 | 98 | 1.7 s | 2.9 s | 90 ms | 0 | 2.2 s |
| `/library` | 86 | 92 | 1.8 s | 3.6 s | 210 ms | 0 | 1.9 s |

All runs:

- `/`: 94 (LCP 2.8 s, TBT 80 ms), 93 (3.0 s, 90 ms), 94 (2.9 s, 100 ms). A fourth run recorded no
  LCP (`LanternError: NO_LCP`, performance null) and was discarded. This happens now and then with
  the headless shell; rerun when it does.
- `/library`: 86 (LCP 3.5 s, TBT 210 ms), 76 (3.6 s, 500 ms), 87 (3.6 s, 170 ms). The 76 run had
  benchmark index 1564, so the CPU was busy with something else. Treat TBT swings of a few hundred
  ms on this machine as noise.

## What costs points

Performance, both routes:

- Render-blocking requests (about 1 s estimated savings). These are the Google Fonts stylesheet
  (`fonts.googleapis.com/css2?family=Outfit...`) and the main CSS chunk. The redesign branch
  self-hosts Inter through `next/font`, which should remove the external request, as long as the
  Google Fonts `@import` in `tokens/fonts.css` stays out of the app's CSS.
- Unused JavaScript (about 25 KiB) and legacy JavaScript polyfills (about 14 KiB).
- `/`: the LCP element is the "DorfMovies" wordmark in the header. No image is in the first
  mobile viewport.
- `/library`: the LCP element is the first row's poster (Sinners, 64x96). It is
  `loading="lazy"`, so the LCP request discovery insight fails. Main-thread work is 2.1 s.

Accessibility:

- `/` (98): `heading-order`. The "Release Calendar" card heading is an `h3` that skips a level.
- `/library` (92): `color-contrast` (24 items). The "Watched <date>" lines are 3.5:1
  (`#776d5b` on `#1b1711`).
- `/library`: `target-size` (24 items). The "Clear rating" buttons are under 24x24 px.

## Rerunning

On gmk1, with the mock and a prod build up:

```sh
~/tools/mtg-mock/run.sh app <checkout> 3200 prod
~/tools/mtg-mock/run.sh lighthouse 3200 / /tmp/mtg-lh/home          # writes home.report.json and .html
~/tools/mtg-mock/run.sh lighthouse 3200 /library /tmp/mtg-lh/library
~/tools/mtg-mock/run.sh app-stop 3200; ~/tools/mtg-mock/run.sh mock stop
```

Compare against this file using the median of three runs on the same machine. Absolute numbers
from gmk1 won't match a developer laptop or PageSpeed Insights.
