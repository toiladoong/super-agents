---
name: review
description: Review already-written code with a team of Orca workers (reviewer + skeptic, coder fixes blocking issues, tester), or compactly in one tab with subagents via here — a shortcut for the dev skill's review mode. Use when the user calls /review or asks to have agents review uncommitted changes / a branch.
---
# /review [here | off] [ticket] [branch] [--env <name|url>]

Shortcut for `/dev review`: read `../dev/SKILL.md` (same plugin; its `SKILL_DIR` is the `dev` directory next to this
one), then run exactly as if the user typed `/dev review <args>`, following the `/dev review` section in
`../dev/modes.md`.

- No arguments → review the uncommitted changes in the current checkout.
- A branch → review that branch.
- A ticket → use the ticket to write the acceptance criteria.
- `--env <name|url>` → the tester tests that real environment (`environments` in `.agents/team.json`, or a URL)
  instead of a local build.
- `here` → run compactly in this tab with subagents, without opening Orca tabs / workers (the `here` section in
  `../dev/modes.md`). After the review, always stop and ask the user which issues to fix; fix nothing until confirmed.
  The plugin's mod **hard-locks** the file-editing tools (Edit / Write / MultiEdit / NotebookEdit) until the user
  replies with "sửa …" / "fix …" (e.g. "sửa 1, 3", "sửa hết lỗi chặn" / "fix all blocking"), and unlocks them for
  that turn only.
- The lock turns off by itself when the review ends (the acceptance message ends with the line `✅ Review xong` (vi) /
  `✅ Review done` (en)), when the user replies "không sửa" / "skip" or "bỏ qua", or when the user types another `/…`
  command. With `off` (or when the user says "xong review" / "done review") → turn the lock off manually; only report
  "review lock turned off", do nothing else.

The old `--here` / `--off` syntax still works.

The flow, roles, how to open the orchestrator tab and the rules all follow the `dev` skill; this skill adds no rules.
