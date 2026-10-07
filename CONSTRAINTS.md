# CONSTRAINTS.md

Quality bar for this repo. Two independent projects live here: `Back/`
(NestJS + vitest) and `Front/tournament-jj/` (Next.js + vitest). Every
number below was measured on 2026-09-17 and is held as a **floor** (must
not regress) rather than an arbitrary target — there was no prior bar to
inherit, so we started from what's true today. Adjust with `/constraints
ratchet` once a number has been intentionally improved.

**Enforcement: warn, don't block.** A failing check reports and the agent
keeps working — it doesn't halt the task. This was an explicit choice: the
codebase has pre-existing debt (see Exceptions) and blocking on it would
just get bypassed. Escalate to `block` once the backlog below is paid down.

## Floor

| Dimension | Check | Command | Reason |
|---|---|---|---|
| Types | `tsc --noEmit` | `check:fast` | Compiler is the cheapest bug-catcher available; already clean, keep it that way. |
| Lint | ESLint (`@typescript-eslint`) | `check:fast` | Catches unused vars, duplicate enum values, dead imports. |
| Secrets | gitleaks over git history | `check:full` (Back) | Prevents committed credentials; a 2026-09-17 scan found 1 false positive (see Exceptions), 0 real leaks. |
| Static security | Semgrep `--config auto` | `check:full` | Catches injection/CORS/sanitization classes of bugs; this repo has an active security-hardening effort (see memory: OWASP audit 2026-09-13). |
| Tests | vitest | `check:fast`/`check:task` runs changed-file tests, `check:full` runs everything | Must stay green; this repo's hardening commits (auth, PDF, weigh-in) depend on regression coverage. |

## Measured only (no enforced number — tracked so drift is visible)

| Project | Metric | Value on 2026-09-17 | Command |
|---|---|---|---|
| Back | Test suite | 379 tests / 70 files passing, ~7s | `yarn test` |
| Back | Coverage (statements/branches/functions/lines) | 51.55% / 77.28% / 69.33% / 51.55% | `yarn test:cov` |
| Back | Lint errors | 19 (pre-existing, see Exceptions) | `yarn lint` |
| Front | Test suite | 93 tests / 27 files passing, ~6s | `yarn test:run` |
| Front | Coverage (statements/branches/functions/lines) | 19.65% / 64.35% / 52.38% / 19.65% | `npx vitest run --coverage` |
| Front | Lint warnings | 11, all `react-hooks/exhaustive-deps` | `yarn lint` |

Whole-repo coverage is not gated — most of this codebase predates any
coverage discipline. What's enforced instead is `--changed`, so new/edited
code is exercised by its own tests without demanding a repo-wide rewrite.

## Check placement (by cost)

- **Edit loop (seconds):** `check:fast` — `tsc --noEmit` + `eslint` (or `next
  lint` in Front), scoped to `src`/`test`.
- **Task end (<90s):** `check:task` — `check:fast` + `vitest run --changed
  --coverage` (only tests touched by the diff, per vitest's own git-diff
  detection — no extra tooling needed).
- **Review / before merge:** `check:full` — full test suite + full
  coverage + `semgrep --config auto --error src` + (Back only)
  `gitleaks detect` over the whole git history. Not run per-edit: semgrep
  and the full suite are too slow for the edit loop.

Run manually: `yarn check:fast` / `yarn check:task` / `yarn check:full`
inside `Back/` or `Front/tournament-jj/`.

## Setup performed by `/constraints`

- **Fixed Back's lint** — `Back/` had no own `.eslintrc.js`, so ESLint
  climbed to the monorepo-root config and tried to resolve
  `@typescript-eslint/eslint-plugin` relative to *that* directory, which
  doesn't have the plugin installed. `yarn lint` was silently broken
  (exit 2, "plugin not found") before this fix. Added
  `Back/.eslintrc.js` (`root: true`, same rules) so plugins resolve from
  `Back/node_modules`, where they already exist.
- **Installed tooling** (none of this was present before):
  `@vitest/coverage-v8@3.2.7` in both `Back/` and `Front/tournament-jj/`
  (pinned to v3, not latest, because latest requires Node ≥22 and this
  repo runs Node 20.18.0); `semgrep` (`pip install --user`) and `gitleaks`
  (binary in `~/.local/bin`) at the OS level, not as repo deps.
- **Added `.gitleaksignore`** at repo root for one confirmed false
  positive: `Back/README.md:5` is NestJS's stock CircleCI badge
  (`token=abc123def456`), not a real secret.

## Exceptions

| What | Where | Owner | Why not fixed now | Expires |
|---|---|---|---|---|
| 19 pre-existing ESLint errors (unused vars, duplicate enum values) | `Back/src`, `Back/test` | gabriel | Lint was broken (see above) before this setup, so these accumulated unnoticed; out of scope for a constraints-setup pass. | 2026-10-17 — pay down or re-except |
| Semgrep: `message.replace('\n', '')` only replaces first occurrence | `Back/src/configuration/logger.configuration.ts:38` | gabriel | Pre-existing; log-sanitization bypass risk, not currently exploited path. | 2026-10-17 |
| Semgrep: `app.enableCors()` allows any origin | `Back/src/main.ts:6` | gabriel | Pre-existing; flagged in OWASP audit 2026-09-13 memory as a known item, needs an explicit allowlist decision. | 2026-10-17 |

## For agents

See the root `CLAUDE.md` — it points here and says not to weaken this file
to make a change pass.
