---
name: setup
description: Set up super-agents on this machine after installing the Claude Code plugin — the Agent Office panel in Orca, Orca's orchestration skill, and the same skills for Codex. Use when the user calls /setup or asks to install / finish installing super-agents, the Agent Office panel or the Office plugin.
---
# /setup

Finish installing super-agents on this machine. Check each item first and skip what is already there; for each one
that is missing, say what you will run and ask before running it. Reply in the user's language (Vietnamese unless
they write in another one). End with a short table: item, state (already there / installed / skipped / failed).

1. **Orca**: `orca status` (or `orca --help`) must work. If `orca` is not found, stop: tell the user to install Orca
   and turn on its CLI, then run `/setup` again.
2. **Agent Office panel**: `orca plugin list` lists `super-agents-office` as `running` or `idle` → there. Listed
   but `errored` / disabled (e.g. "no longer approved") → tell the user to approve or enable it in Orca Settings →
   Plugins (or open the install link again); do not count it as installed. Not listed → open the install link, which
   shows Orca's own confirm (**Add catalog** → **Review & Install** → approve the access):
   - Windows: PowerShell `Start-Process "orca://plugins/toiladoong.super-agents-office?catalog=https://github.com/toiladoong/super-agents.git"`
     (cmd / Git Bash: `start "" "<same link>"`)
   - macOS: `open "<same link>"`; Linux: `xdg-open "<same link>"`

   Tell the user to click through the three steps in Orca, then check `orca plugin list` again.
3. **Orca's orchestration skill** (`/super-agents:dev` starts workers with it): `orca skills installed` lists
   `orchestration` → there; otherwise `orca skills install --skill orchestration`.
4. **Codex** (only if `codex --version` works and the user uses Codex in Orca): `codex plugin list` shows
   `super-agents` → there; otherwise `codex plugin marketplace add toiladoong/super-agents` then
   `codex plugin add super-agents@super-agents`. If `~/.agents/skills/dev` is a junction / link to an old clone of this
   repo, offer to remove that link so Codex does not load the skill twice.
5. **Repo config** (optional): in the current repo, `.agents/team.json` missing → say that the **⚙ Team** button of
   the Agent Office panel creates it from the defaults; do not create it yourself unless asked.

Run nothing else; never `--approve` an Orca plugin for the user — the approval is theirs, in Orca's own dialog.
