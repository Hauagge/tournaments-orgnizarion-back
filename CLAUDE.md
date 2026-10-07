# CLAUDE.md

Read `CONSTRAINTS.md` at the repo root before making changes in `Back/` or
`Front/tournament-jj/`. It defines the quality bar (types, lint, tests,
secrets, static security) for this repo. Never weaken it — lower a
threshold, delete/skip a test, add a suppression, or add an exception —
just to make a change pass. If a check is wrong, fix the check and say so;
don't route around it silently.
