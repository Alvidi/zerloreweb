# Agent Quick Rules

If you are an agent working on this repository, read these docs first:

1. `docs/DEVELOPMENT_GUIDE.md`

Non-negotiable rules:

- Keep ES/EN content consistent. Do not update only one language unless explicitly requested.
- When Alberto provides new HTML (usually Spanish), run the corresponding sync workflow.
- Validate before closing: `npm run lint`, `npm run build`, and `npm run battle:smoke` for combat-related changes.
- Do incremental changes (ability by ability) to avoid regressions.
- Do not silently change game-rule behavior while doing pure refactors.

Working contract for this repo:

- Work in small, validated steps (one ability / one rule slice at a time).
- Keep combat-log output clear and non-redundant.
- Prefer explicit over clever: code should be easy to modify later.
- If a rule is ambiguous, pause and confirm before implementing logic.
- Close each task with traceability: what changed, why, and how it was validated.
