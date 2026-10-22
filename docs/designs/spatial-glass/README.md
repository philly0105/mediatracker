# Spatial Glass: redesign handoff

Approved design direction for the DorfMovies redesign (October 2026).

| File | What it is |
|---|---|
| `reference/home.html` | **The approved design, the visual source of truth.** Open it in a browser; images are in `reference/assets/`, and Inter loads from Google Fonts. It is responsive, so resize the window to see the 1020px and 760px breakpoints. |
| `screenshots/home-desktop-top.jpg`, `home-desktop-2.jpg`, `home-desktop-3.jpg` | 1440×900 slices of the reference at full resolution |
| `screenshots/home-desktop-full.jpg`, `home-mobile.jpg` | Full page at 1440 and at 390 |
| `KICKOFF-PROMPT.md` | Paste this into Claude Code to start the work |
| `../../superpowers/specs/2026-10-22-spatial-glass-redesign.md` | Design spec: tokens, glass tiers, components, page-by-page direction, acceptance criteria |
| `../../superpowers/plans/2026-10-22-spatial-glass-redesign.md` | Implementation plan, Tasks 0–14, with checkboxes |

Notes
- Title facts and artwork in the reference are real TMDB data. Richard's watch history, ratings and stats are **sample data**.
- Only Home was designed. Every other route is specified in spec §5.6 and built from the same tokens and components.
- `baseline/` and `after/` are created during the work (plan Tasks 0 and 14) to compare before and after.
