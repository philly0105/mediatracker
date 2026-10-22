# Lighthouse after the redesign

Mobile Lighthouse, Performance and Accessibility, for `redesign/spatial-glass` at `604b9fd` (the
redesign with the Task 14 performance fixes). Measured 2026-10-22 on gmk1, interleaved with the
pre-redesign build (`45db05b`) so that drift in the host's load hits both builds alike.

## Conditions

The same as [the baseline](../baseline/lighthouse.md), except:

- Both builds run at once against the same mtg-mock: the redesign on 127.0.0.1:3200, the baseline
  on 3201. Both are production builds (`next build && next start`).
- `compare.sh` (on gmk1, `~/tools/pw/qa/lh/`) runs three rounds of redesign `/`, baseline `/`,
  redesign `/library`, baseline `/library`.
- Benchmark index 2082 to 2281 across the runs.
- The redesign self-hosts Inter through `next/font`. The baseline still loads Outfit from Google
  Fonts.

Three runs per route and build. One baseline `/` run recorded no LCP (`NO_LCP`, performance null)
and was replaced by a fourth. The table shows the median run; the full list is below it.

| Route | Build | Performance | Accessibility | FCP | LCP | TBT | CLS | Speed Index |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | redesign | 87 | 100 | 1.2 s | 3.7 s | 170 ms | 0 | 2.2 s |
| `/` | baseline | 94 | 98 | 1.8 s | 2.9 s | 90 ms | 0 | 2.3 s |
| `/library` | redesign | 89 | 100 | 1.1 s | 3.6 s | 140 ms | 0 | 1.3 s |
| `/library` | baseline | 87 | 92 | 1.9 s | 3.6 s | 170 ms | 0 | 1.9 s |

All runs, with the observed (unthrottled) FCP and LCP from the same trace:

- Redesign `/`: 87 (LCP 3.7 s, TBT 170 ms; observed 414 / 819 ms), 88 (3.7 s, 140 ms;
  196 / 471 ms), 86 (3.7 s, 200 ms; 212 / 530 ms). The first was the first request after the app
  restarted, so the server was cold (TTFB 200 ms against about 50 ms).
- Baseline `/`: 94 (2.8 s, 80 ms; 350 / 350 ms), 93 (2.9 s, 90 ms; 397 / 397 ms), 94 (2.9 s,
  90 ms; 370 / 370 ms).
- Redesign `/library`: 87 (3.5 s, 230 ms; 272 / 590 ms, at benchmark index 2082, the lowest of the
  session), 91 (3.3 s, 120 ms; 178 / 421 ms), 89 (3.6 s, 140 ms; 190 / 432 ms).
- Baseline `/library`: 87 (3.6 s, 170 ms; 484 / 724 ms), 90 (3.2 s, 130 ms; 608 / 826 ms), 86
  (3.6 s, 200 ms; 361 / 635 ms).

Two earlier interleaved rounds:

- Before the recommendations skeleton fix and the UTC date formatter: `/` 88, 87 and 86 against
  92, 94 and 93; `/library` 91, 88 and 89 against 90, 90 and 87.
- Before any of the loading-skeleton fixes: `/` 87, 88 and 88 against 93 and 93 (a third baseline run
  recorded no LCP); `/library` 90, 92 and 89 against 86, 90 and 90.

## Result

`/library` is level within the run-to-run spread: 89 against 87 here, 89 against 90 and 90 against
90 in the earlier rounds. `/` scores 5 to 7 points lower in every round (7 here), all of it from
the simulated LCP. The other
measures on `/` improved or held: FCP 1.1 to 1.2 s against 1.8 s, Speed Index 1.6 to 2.2 s against
2.3 s, CLS 0, accessibility 100 against 98.

## What costs points

`/`, simulated LCP (3.7 s against 2.9 s):

- The LCP element is the hero backdrop (`section.glass-panel ... img.object-cover`, 364x220).
  Observed breakdown in the two warm runs: TTFB 49 to 55 ms, load delay 191 to 214 ms, load 4 ms,
  element render delay 222 to 264 ms. The image is preloaded with `fetchPriority="high"` and
  arrives early; the time goes to waiting for the paint.
- That render delay is React 19.2's Suspense reveal throttle. The shell and the hero skeleton paint
  first (observed FCP about 200 ms), and React holds the next reveal until about 300 ms after the
  previous one, so the hero art paints at about 470 to 530 ms. Lantern's simulation stretches that
  gap to 3.7 s.
- The baseline has no early paint to throttle against. Its render-blocking Google Fonts stylesheet
  (1,040 to 1,060 ms estimated savings) holds the first paint until the page is ready, so FCP and
  LCP are the same frame (observed 350 to 397 ms), and its LCP element is the mobile wordmark text.
- On a phone this means the redesign shows the page frame at about 200 ms instead of a blank screen
  until about 370 ms, and the hero art at about 500 ms. Only the simulated LCP counts against it.
  If that score matters more than the early frame, the hero could render from stored art outside
  the Suspense boundary, which leaves the throttle nothing to hold.

`/`, TBT (140 to 200 ms against 80 to 90 ms): the dashboard hydrates more than before (hero slab,
Up next, Coming soon, the rail and the stats panel). Main-thread work is 1.9 to 2.1 s against 1.6
to 1.7 s.

`/library`: the LCP element is a text line in the first row (`div.glass-row p`), observed at 421 to
590 ms against the baseline's poster at 635 to 826 ms. Median TBT is 140 ms against 170 ms.

Both routes:

- Render-blocking requests: 100 to 210 ms estimated savings (the main CSS chunk), against 1,040 to
  1,200 ms for the baseline. The Google Fonts request is gone.
- Unused JavaScript: 24 KiB on both routes (baseline 25 KiB). Legacy polyfills: 14 KiB, the same
  as the baseline.
- Transfer: 522 KiB on `/` against 427 KiB, and 409 KiB on `/library` against 374 KiB. On `/` the
  extra is mostly images (172 KiB against 117: the hero backdrop, Up next stills and rail posters)
  and the HTML document (47 KiB against 22, the fuller page's markup and payload). On `/library` it
  is spread out: document +13 KiB, images +9, fonts +8, scripts +5.

Fixed during this pass:

- Loading skeletons with client components. A link prefetches a dynamic route up to its
  `loading.tsx`, and the browser downloads the client chunks listed for each client component
  rendered there. When the page renders the same component, that list is the page's whole client
  bundle: a `Card` in the settings skeleton put the Supabase auth client on every page.
  The calendar, settings and stats skeletons now draw panels from `cardVariants.ts`, and the
  recommendations skeleton takes its row from `RecommendationCardSkeleton.tsx` instead of the client
  `RecommendationCard.tsx`. Home scripts went from 264 KiB to 195 KiB (baseline 185 KiB).
  `performanceBoundaries.test.ts` follows each skeleton's local imports and fails if any of them
  reaches a client module.
- Hero art in the Suspense fallback: the home skeleton draws the stored backdrop with `preload`
  and `fetchPriority="high"`, so the LCP image starts with the HTML instead of after the
  TMDB-backed hero streams in.
- Image `sizes` for the Recently watched rail and the Up next stills now match their rendered width.
- The library scroll profile (Task 10 in the plan).

Accessibility is 100 on both routes. The baseline's failures (`heading-order` on `/`,
`color-contrast` and `target-size` on `/library`) are gone.

## Rerunning

On gmk1, with the mock up:

```sh
~/tools/mtg-mock/run.sh app <redesign checkout> 3200 prod
~/tools/mtg-mock/run.sh app <baseline checkout> 3201 prod
~/tools/pw/qa/lh/compare.sh /tmp/lh-compare   # 12 runs; summary.jsonl beside the reports
~/tools/mtg-mock/run.sh app-stop 3200; ~/tools/mtg-mock/run.sh app-stop 3201; ~/tools/mtg-mock/run.sh mock stop
```

The first run after an app starts pays for a cold server, so load each route once before
measuring. Compare medians from the same session only. A run that records no LCP (`NO_LCP`) is a
headless shell hiccup; discard it and rerun.
