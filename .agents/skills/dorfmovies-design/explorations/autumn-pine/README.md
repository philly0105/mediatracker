# Autumn Pine archive

This folder holds the design-system material from before the Spatial Glass redesign
(October 2026). Nothing here describes the current app. Don't copy values, components or
guidance from it into new work. The live system is in the skill root: `readme.md`,
`tokens/`, `glass.css`, `guidelines/` and `components/`.

It no longer renders as designed. The token files it was built on were retuned in place
(commit `9d8227d`), so `styles.css` now serves Spatial Glass values, and the JSX kit
reads colour names that F-47 deleted in August 2026 (`--violet-*`, `--rose-*`,
`--emerald-*`, `--orange-*`) along with `--page-radial` and the `--orb-*` tokens, which
are gone too. To see it as it was, check out the parent of `9d8227d`.

What is here:

- `components/`: the Claude Design JSX kit (`*.jsx`, `*.d.ts`), its preview cards
  (`*.card.html`) and the prompts that described it. `IconChip` and `SpotlightCard` were
  retired outright. The rest were replaced by the real primitives in `components/ui/`,
  which the live `components/**/*.prompt.md` files describe.
- `_ds_bundle.js`: the compiled kit (namespace `window.DorfMoviesDesignSystem_f30e74`).
- `ui_kits/dorfmovies/`: the click-through recreation of the app on that kit.
- `palette-options.html`: the palette exploration that chose Autumn Pine.
- `guidelines/`, `assets/wordmark.html`: the Autumn Pine specimen cards and text
  wordmark, as they stood before the rewrite.
- `autumn-pine-readme.md`: the old skill `readme.md`, the written guidance. It was
  renamed because on Windows `readme.md` and this `README.md` are the same file.
- `SKILL.md.txt`: the old skill manifest, renamed so skill loaders don't pick it up as a
  second skill.
- `_ds_manifest.json`, `_adherence.oxlintrc.json`, `.thumbnail`: the old export metadata
  and preview image.
