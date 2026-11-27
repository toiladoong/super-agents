---
name: debug
description: Fix a bug methodically with a team of Orca workers, or in one tab with subagents via here — reproduce it and collect the logs, test up to 3 hypotheses with evidence, report the root cause for approval, then a test-first fix with review and test. A shortcut for the dev skill's debug mode. Use when the user calls /debug or asks agents to find why something breaks.
---
# /debug [here] <bug, ticket or error>

Shortcut for `/dev debug`: read `../dev/SKILL.md` (same plugin; its `SKILL_DIR` is the `dev` directory next to this
one), then run exactly as if the user typed `/dev debug <args>`, following the "Debug a bug" section in
`../dev/modes.md`.

- No fix before the root cause is shown with evidence and the user approves it.
- `here` → run in this tab with subagents, without opening Orca tabs / workers; the plugin's mod **hard-locks** the
  edit tools until the user answers "sửa …" / "fix …", as for `/review here`, and turns off when the run closes with
  `✅ Review xong` / `✅ Review done`, on "không sửa" / "skip", on another `/…` command, or with `/debug off`.

The flow, roles, how to open the orchestrator tab and the rules all follow the `dev` skill; this skill adds no rules.
