# Kickoff prompt for Claude Code

Run Claude Code from the repo root (after unzipping the handoff there) and paste this:

```text
We're redesigning DorfMovies to the approved "Spatial Glass" look. This is a visual redesign only: don't change behaviour, routes or copy.

1. Read docs/designs/spatial-glass/README.md, then the spec at docs/superpowers/specs/2026-10-22-spatial-glass-redesign.md and the plan at docs/superpowers/plans/2026-10-22-spatial-glass-redesign.md.
2. Look at the approved design: render docs/designs/spatial-glass/reference/home.html in a browser if you can, and read the screenshots in docs/designs/spatial-glass/screenshots/. The reference is the visual source of truth.
3. Create the branch redesign/spatial-glass and execute the plan task by task with superpowers:subagent-driven-development (or superpowers:executing-plans; if those skills aren't installed, just follow the plan in order). Tick the checkboxes in the plan file as you finish steps and commit after each task.
4. After every task run npm run lint, npm run test:run and npm run build. Don't move on while anything is red.
5. Stop and show me the result (with npm run dev running) after Task 4 (tokens, glass and ambient backdrop), after Task 8 (home page) and after Task 10 (library). Wait for my OK before continuing.
6. Ask me before applying the database migration in Task 5 to Supabase.
```

To resume in a later session, paste:

```text
Continue the Spatial Glass redesign: read docs/superpowers/plans/2026-10-22-spatial-glass-redesign.md, find the first unticked step, and carry on with the same rules (lint, test and build after each task; stop at the review checkpoints after Tasks 4, 8 and 10; ask before migrations).
```
