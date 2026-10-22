# DorfMovies design system: vendored copy

This directory is the canonical source the build depends on. Every colour, type,
spacing, effect and texture token the app renders comes from `tokens/`.

`app/globals.css` imports the token files one by one (`colors`, `typography`, `spacing`,
`effects`, `textures`, `keyframes`). It does not import `styles.css`, because
`styles.css` also pulls in `tokens/fonts.css` and its Google Fonts `@import`. The app
gets Inter from `next/font`, which already registers the family as `'Inter'`, and a
second `@font-face` set under that name would leave the browser to pick a source by
stylesheet order. `styles.css` and `fonts.css` are vendored anyway so the two copies
match file for file; nothing in the app loads them. When you add a token file, add its
`@import` to `app/globals.css` as well as to `styles.css`.

## Why it is vendored

`app/globals.css` used to `@import` these files directly out of
`.agents/skills/dorfmovies-design/`. That made the production stylesheet depend on an
agent-tooling folder: if the skill were updated, regenerated, or filtered out of a
deployment artifact, every token would silently go undefined and the app would render
as unstyled Tailwind defaults on a white background. It also forced the
`turbopack.root` pin in `next.config.ts`, because the relative path escaped the app
directory.

## Authoring

`.agents/skills/dorfmovies-design/` is where the design system is written. The skill
carries the Spatial Glass principles, the glass tiers and their performance budget,
the component recipes and the specimen cards that explain the tokens. Edit tokens
there, then sync them into this directory:

```bash
cp .agents/skills/dorfmovies-design/styles.css app/styles/design-system/styles.css
cp .agents/skills/dorfmovies-design/tokens/*.css app/styles/design-system/tokens/
```

The two copies must stay byte-identical. `__tests__/designSystemSync.test.ts` compares
the token files and `styles.css` (ignoring line endings) and fails if they drift, so a
token edited in only one place breaks the suite rather than shipping a stale build.

The skill's `glass.css` is not vendored. It mirrors the glass tier classes in the
`@layer components` block of `app/globals.css` so the skill's HTML pages render the same
tiers, and no test compares the two. Change both together.
