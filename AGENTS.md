# Agent Quick Rules

If you are an agent working on this repository, read these docs first:

1. `docs/DEVELOPMENT_GUIDE.md`

Non-negotiable rules:

- Keep ES/EN content consistent. Do not update only one language unless explicitly requested.
- When Alberto provides new content (usually Spanish), update both ES/EN sources directly (MD for rules, JSON for factions).
- Validate before closing: `npm run lint`, `npm run build`, and `npm run battle:smoke` for combat-related changes.
- Do incremental changes (ability by ability) to avoid regressions.
- Do not silently change game-rule behavior while doing pure refactors.
- In `Reglamento`, remember there are visual insertions layered on top of Markdown (doctrines, command posts, flags, activation, state, and damage tokens). Do not break those hooks accidentally.
- If new rulebook text explicitly references a token, check whether that token should also be inserted visually in the rulebook web/PDF flow.

Working contract for this repo:

- Work in small, validated steps (one ability / one rule slice at a time).
- Keep combat-log output clear and non-redundant.
- Prefer explicit over clever: code should be easy to modify later.
- If a rule is ambiguous, pause and confirm before implementing logic.
- Close each task with traceability: what changed, why, and how it was validated.
