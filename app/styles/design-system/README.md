# DorfMovies design system — vendored copy

**This directory is the canonical source the build depends on.** `app/globals.css`
imports `styles.css` from here, and every colour, type, spacing, effect and texture
token the app renders comes from `tokens/`.

## Why it is vendored

`app/globals.css` used to `@import` these files directly out of
`.agents/skills/dorfmovies-design/`. That made the production stylesheet depend on an
agent-tooling folder: if the skill were updated, regenerated, or filtered out of a
deployment artifact, every token would silently go undefined and the app would render
as unstyled Tailwind defaults on a white background. It also forced the
`turbopack.root` pin in `next.config.ts`, because the relative path escaped the app
directory.

## Authoring

`.agents/skills/dorfmovies-design/` remains the **authoring surface** — the skill
carries the guidelines, component references and UI kits that explain the tokens. Edit
tokens there, then sync into this directory:

```bash
cp .agents/skills/dorfmovies-design/styles.css app/styles/design-system/styles.css
cp .agents/skills/dorfmovies-design/tokens/*.css app/styles/design-system/tokens/
```

The two copies must stay byte-identical. `__tests__/designSystemSync.test.ts` compares
them and fails if they drift, so a token edited in only one place breaks the suite
rather than shipping a stale build.
