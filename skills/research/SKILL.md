---
name: research
description: Investigate a question, or weigh whether an idea is worth investing in and pursuing — researchers gather evidence (need / value, cost / feasibility, alternatives), a skeptic challenges it, and the report ends with a verdict (pursue / start small / wait for evidence / drop) and the cheapest next step. A shortcut for the dev skill's research mode; nothing is coded. Use when the user calls /research, or asks whether an idea / feature is worth doing.
---
# /research [here] [idea] <question or idea>

Shortcut for `/dev research`: read `../dev/SKILL.md` (same plugin; its `SKILL_DIR` is the `dev` directory next to this
one), then run exactly as if the user typed `/dev research <args>`, following the "Research only" section in
`../dev/modes.md`.

- A question → researchers answer it with evidence.
- `idea <idea>` (or a request like "có nên…" / "should we…", "đáng làm không" / "worth it?") → evaluate the idea:
  evidence for and against, a verdict and the cheapest next step.
- `here` → run in this tab with subagents, without opening Orca tabs / workers.

Nothing is coded or changed in the repo besides the report file. The flow, roles, how to open the orchestrator tab and
the rules all follow the `dev` skill; this skill adds no rules.
