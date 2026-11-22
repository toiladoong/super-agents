---
name: audit
description: Audit the quality of the whole repo or some folders with a team of Orca workers (reviewers split the repo and run ponytail-audit, a skeptic checks the blocking findings), or compactly in one tab with subagents via here — a shortcut for the dev skill's audit mode. Reports a numbered list and fixes nothing until asked. Use when the user calls /audit or asks agents to audit / health-check the codebase.
---
# /audit [here] [path …]

Shortcut for `/dev audit`: read `../dev/SKILL.md` (same plugin; its `SKILL_DIR` is the `dev` directory next to this
one), then run exactly as if the user typed `/dev audit <args>`, following the "Audit the repo" section in
`../dev/modes.md`.

- No path → the whole repo; paths → only those folders.
- `here` → run in this tab with subagents, without opening Orca tabs / workers. After the report, always stop and ask
  which findings to fix; the plugin's mod **hard-locks** the edit tools until the user answers "sửa …" / "fix …", as
  for `/review here`, and turns off when the audit closes with `✅ Review xong` / `✅ Review done`, on "không sửa" /
  "skip", on another `/…` command, or with `/audit off`.

The flow, roles, how to open the orchestrator tab and the rules all follow the `dev` skill; this skill adds no rules.
