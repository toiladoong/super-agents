# super-agents

Vietnamese: [README.md](README.md)

A team of agents running in Orca: an **orchestrator** coordinates a **researcher**, **coder**, **reviewer** and **tester**
for one ticket. Which AI / model each role runs on is configured per repo (Claude by default).

## Install
Repo: https://github.com/toiladoong/super-agents

Claude Code (once per machine):

```
/plugin marketplace add toiladoong/super-agents
/plugin install super-agents@super-agents
```

To update to a new version: `/plugin marketplace update super-agents` then `/plugin update super-agents@super-agents` (or
`/reload-plugins` in an open session).

In Orca, the Claude profiles share `~/.claude/plugins` (junction): install **once from `~/.claude`**, don't install from
an Orca session (if the path is recorded under the Orca profile, the Claude desktop app skips the plugin):

```
CLAUDE_CONFIG_DIR="$HOME/.claude" claude plugin marketplace add toiladoong/super-agents
CLAUDE_CONFIG_DIR="$HOME/.claude" claude plugin install super-agents@super-agents
```

Other AIs (Codex, opencode...) and the Orca panel need the code on the machine: `git clone https://github.com/toiladoong/super-agents.git`.
- Skill for other AIs: Orca's shared skill folder `~/.agents/skills/`. Windows:
  `New-Item -ItemType Junction -Path "$env:USERPROFILE\.agents\skills\dev" -Target "<clone folder>\skills\dev"`
  (macOS / Linux: `ln -s`). `orca skills installed` must show `dev` under "Agent skills home".
- Agent Office panel: `orca plugin dev load <clone folder>/office` (see the Agent Office section below).

Requires: Orca running, the `orca` CLI, Orca's `orchestration` skill (`orca skills install --skill orchestration`).

## Language
Replies, plans and reports follow `"language": "vi" | "en"` in the repo's `.agents/team.json` (default `vi`; also
selectable in the Team editor). The `/office` pane, the Orca panel and the Team editor follow it too (the panel takes
the focused workspace's; one without `language` follows Orca Settings → Agent Office → Language). Review answers are understood
in both languages (e.g. "sửa 1, 3" / "fix 1, 3", "không sửa" / "skip").

## Usage
| Command (Claude Code) | What it does |
|---|---|
| `/super-agents:dev <ticket> [--research]` | Opens an orchestrator tab: (research, when `--research` is given or the ticket is unclear) → plan → you approve → code → review → test → acceptance → you approve |
| `/super-agents:dev research <question>` | Research only, no code |
| `/super-agents:dev review <ticket> [branch]` | Already-written code: review → fix → test |
| `/super-agents:dev plan [here] <ticket>` | Plan only (research if needed) → you approve → saved to `.agents/plans/<ticket>.md`, no code yet. Then `/super-agents:dev <ticket>` follows this file |
| `/super-agents:review [ticket] [branch]` | Shortcut for the row above: review only (no arguments = uncommitted changes) |
| `/super-agents:review here [ticket]` | Compact review in the current tab with a Claude subagent, no Orca tab / worker opened. **File edits are locked** (status bar 🔒) until you answer "sửa 1, 3" / "fix 1, 3" or "sửa hết lỗi chặn" / "fix all blocking"; unlocked for exactly that turn, then locked again |
| `/super-agents:review off` | Turn the lock off manually (or say "xong review" / "done review"). Usually not needed: the lock turns off by itself when the review is done (the `✅ Review xong` / `✅ Review done` line), when you answer "không sửa" / "skip" or "bỏ qua" / "ignore", or when you type another `/…` command |
| `env <name\|url>` (added to `dev` / `review`) | The tester tests a real environment (e.g. a staging / production web domain) instead of a local build. Names come from `environments` in `.agents/team.json`: `{ "staging": "https://…" }`. The tester first checks the environment runs the build under test; test accounts only, no payments / deleting / changing real data, production is look-only |
| `/super-agents:dev status` | Table of workers busy / idle / waiting |

During a `here` review, the suggestion after each turn (Orca chat box and Claude Code prompt box) is the next answer: after a review turn it is **"sửa hết lỗi chặn"** / **"fix all blocking"**, after a fix turn it is
**"xong review"** / **"done review"**; press **Tab** (or →) to take it, edit if needed (e.g. "sửa 1, 3" / "fix 1, 3") then send.

The orchestrator stops to ask the user at 2 points: spec approval, and acceptance before merging / committing. Workers don't commit.

## Per-repo configuration
Copy `skills/dev/team.default.json` to `<repo>/.agents/team.json` then edit:

```json
{
  "roles": {
    "orchestrator": { "agent": "claude", "model": "opus" },
    "reviewer": { "agent": "codex", "role": ".agents/roles/my-reviewer.md" }
  },
  "notes": ["Thư mục shared/ dùng chung: chỉ một coder sửa.", "Dev server :3000 chỉ tester dùng."]
}
```

- `agent`: Orca agent id. `model`: optional, the model name for that AI (when changing the agent, change / remove the model). Orca only accepts
  `--model` for Claude, Codex, Cursor, Antigravity, Grok, Muse (and OpenCode); other AIs run the model in their own config.
- `role`: the repo's own role file; empty = the default role in `skills/dev/roles/`.
- `notes`: the repo's own rules; the orchestrator copies them into the worker's spec.

With the [ponytail](https://github.com/dietrichgebert/ponytail) plugin, the reviewer runs `/ponytail:ponytail-review` and the orchestrator
runs `/ponytail:ponytail-debt` at acceptance.

## Agent Office (Orca plugin, optional): office panel + visual team.json editing
The `office/` panel: a pixel office in Orca's right sidebar, each agent is an employee at a desk. Shirt color by role,
letter on the shirt chest (O orchestrator, RS researcher, C coder, RV reviewer, S skeptic, T tester);
(read from the tab name: `coder · …`), hair by AI; typing = working, raised hand + "!" = needs you, "…" + coffee cup = waiting,
"✓" = done (leaves the desk after 10 minutes). Hover over a desk to see the name, role, status, time.

**Pet corner** under the office: keep a dog / cat / mouse / bird (feed it, fill its water; hungry or thirsty, it waits by
the bowl) and a plant (cactus, sunflower, pothos, rose: water it to grow it up to flowering; a day without water wilts
it). Everything costs coins: each worker task finished in Orca +10, a whole ticket done (every task of its Run) +30 more;
you start with 30. The pet, plant and wallet live in the plugin's own storage (`storage:own`).

```
orca plugin dev load <plugin folder>/office            # prints a fingerprint
orca plugin dev load <plugin folder>/office --approve <fingerprint>
orca plugin open local.super-agents-office
```

**Visual team editing:** click the **⚙ Team** button on the Agent Office panel (opens `.agents/team.json` of the open workspace; a repo without one gets it created from the plugin's `team.default.json`, not committed), or open `.agents/team.json` (or `team.default.json`) in Orca, choose **Team** on the toggle
next to Source. One row per role (employee preview, AI, model, role file); the `notes` rules can be edited / added / removed.
AI and model are picked from lists; model has suggestions per AI (Claude: opus / sonnet / haiku; Codex: gpt-6.2-sol,
gpt-6.2-astra, gpt-6-astra, gpt-6.1-terra, gpt-6-luna; OpenCode: `provider/model`) and a "type another name…" item.
For AIs without a suggestion list (Antigravity, Cursor), choose "default" or enter a name. Changing the AI clears the old model.
Other keys in the file (such as `_comment`) are kept as-is.

Logic checks: open `office/panel/agents.check.html` and `office/team-editor/editor.check.html` in a
browser; the page title must be `PASS`; worker tests: `orca plugin test office`.

Permissions: the sandboxed panel reads agent state (`agent:read`); a small worker (`worker/main.ts`) lets the ⚙ Team button open the file, needs
`workspace:read` + `workspace:write` and runs as a `trusted-worker` (Orca asks for approval on load). Shows agents of every workspace, the desk name is the session name (the worker reads `orca worktree ps`, refreshed every 3 seconds).

## Office in Claude Code: `/office`
The plugin also has a Claude Code mod: type `/office` to open the **Agent Office** pane next to the transcript. The desktop app, VS Code and
the Claude mobile app draw the pixel office (animated SVG); the terminal shows a text list.

The desks are **the agents of that Claude Code session itself**: the main session (working while a turn runs, waiting when the turn is done) and every
subagent / teammate it calls (`$.agent.list()`: running → typing, waiting / idle → "…", done / error → "✓"). When Claude Code
asks you to approve a tool, that agent raises its hand "!". Hover over a desk to see the description, agent type, last tool called. The role (shirt color) comes
from the first word of the description (`coder · …`) or from the agent type (`web-tester` → tester). Orca is not needed; Orca's agents are shown in the
Agent Office panel in Orca. The **Guide** button under the office opens an explanation of the symbols, shirt / hair colors and usage (both the
`/office` pane and the panel in Orca).

Code is in `hooks/` (`register.tsx`, `agents.ts`, `office-svg.ts`), types in `types/`, tests in `tests/`:
`claude plugin validate .` and `claude plugin test .`.

When you add or change a command, update both guides, each in vi + en: `hooks/help.ts` (the `/office` pane) and
`office/shared/i18n.js` (the Orca panel), plus the command tables in `README.md` / `README.en.md`.
