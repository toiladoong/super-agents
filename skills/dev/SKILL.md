---
name: dev
description: Run a ticket / feature with a team of Orca workers — the orchestrator coordinates (research) → plan → coder → review → test; /dev plan only makes the plan (saved to .agents/plans/<ticket>.md) then stops; /dev review for code already written; /dev research only investigates, or with idea weighs whether an idea is worth pursuing (evidence for / against, verdict, cheapest next step); /dev debug finds a bug's root cause (reproduce, hypotheses, evidence) before a test-first fix; /dev audit checks the quality of the whole repo or some folders (with ponytail-audit) and reports, fixing nothing; /dev status shows which workers are busy / idle. Roles and AIs come from the repo's .agents/team.json (default Claude). Use when the user calls /dev, or asks to split work across several agents / Orca workers.
---
# /dev <ticket or description> [--research] [env <name|url>]  ·  /dev plan [here] <ticket>  ·  /dev research [here] [idea] <question or idea>  ·  /dev review [here] <ticket> [branch] [env <name|url>]  ·  /dev audit [here] [path …]  ·  /dev debug [here] <bug>  ·  /dev status

`SKILL_DIR` = absolute path of the folder holding this file. Default roles are in `SKILL_DIR/roles/`, secondary modes
in `SKILL_DIR/modes.md`.

## Who runs this skill
- **Prompt starts with "You are the orchestrator"** → you are the orchestrator: read `SKILL_DIR/roles/orchestrator.md`,
  then follow the flow below.
- **`/dev status`** → do not open an orchestrator tab, follow the "Monitoring" section in `modes.md`.
- **`plan` with the `here` flag** → do not open an orchestrator tab: you make the plan right in this tab, per the
  "Plan only" section in `modes.md`.
- **`review` with the `here` flag** → do not open an orchestrator tab: you are the orchestrator in this tab, follow
  the "In one tab" section in `modes.md` (subagents instead of Orca workers).
- **`research` with the `here` flag** → do not open an orchestrator tab: run the "Research only" section of
  `modes.md` in this tab with subagents.
- **`debug`** → the "Debug a bug" section in `modes.md`; with `here` you run it in this tab with subagents,
  otherwise open an orchestrator tab as below.
- **`audit`** → the "Audit the repo" section in `modes.md`; with `here` you run it in this tab with subagents,
  otherwise open an orchestrator tab as below.
- **Otherwise** (the user types `/dev` in a normal session) → open an orchestrator tab then stop, do not run the flow
  yourself:

  ```
  orca agent launch --agent <orchestrator.agent> [--model <orchestrator.model>] [--effort <orchestrator.effort>] \
    --worktree current --focus \
    --prompt "You are the orchestrator. Read <SKILL_DIR>/SKILL.md and run with: <the arguments as /dev gets them>"
  ```

  `--effort` only with an `orchestrator.model` and when team.json's `effort` is not `off`.
  The arguments as `/dev` gets them: what the user typed after `/dev`; from a shortcut skill, its mode first —
  `/review SG-1` → `review SG-1`, `/audit webApp/` → `audit webApp/`, `/research idea X` → `research idea X`, `/debug X` → `debug X`. Without the mode word the orchestrator would take
  `SG-1` / `webApp/` for a new ticket and start coding.

  Tell the user: discussion, spec approval and acceptance happen in the orchestrator tab. If the user says "be the
  orchestrator here" → skip this, you are the orchestrator.

The orchestrator uses Orca mechanics (worker-start, send, when woken up...) per the `orchestration` skill
(`orca skills get orchestration`) — read it first. This skill only defines the flow and the rules.

## Config
Read `.agents/team.json` at the repo root; if missing, use `SKILL_DIR/team.default.json`.
- `roles.<role>`: `agent` (Orca id: claude, codex, antigravity, cursor, opencode...), `model` (optional), `effort`
  (optional, a fixed level; see "Effort"), `role` (role prompt file, path from the repo root). Roles: `orchestrator`, `researcher`, `coder`, `reviewer`, `tester`.
  Role missing from the file → `agent: claude`, no `--model`. Role missing `role` → `SKILL_DIR/roles/<role>.md`.
- `notes`: the repo's own rules (shared folders, resources only the tester uses, skills to read...). The orchestrator
  reads and applies them when splitting work, copying the relevant part into each worker's spec.
- `environments` (optional): real environments the tester may test on, name → URL, e.g.
  `{ "develop": "https://develop.example.com", "staging": "https://staging.example.com", "production": "https://example.com" }`. `env <name>` picks one, `env <url>`
  gives a URL directly; a name with an empty URL is not set up yet → ask the user for it (`env` counts only when followed by such a name or an `http(s)://` URL, else it is part of the
  ticket text; the old `--env` works too). Accounts and limits for each environment go in `notes`.
- `effort`: `auto` (default: the orchestrator picks each role's level per ticket) or `off` (pass none).
- `language`: `vi` (default) or `en` — the language every reply to the user, every spec / plan file and every message
  to workers uses. Instructions here are in English; replies follow `language`.

Command for each worker (add `--model` only when there is a `model`, `--effort` per the "Effort" section). The task title **must** start with the role, in
exactly this form, so the Agent Office panel and `/dev status` recognize it (Orca shows the task title as the tab name;
`orca terminal rename` does not reach a chat tab):

```
orca orchestration worker-start --agent <agent> [--model <model>] [--effort <level>] --worktree <...>   --task-title "<role> · <work part>" --spec "<spec>"
```

e.g. `--task-title "reviewer · SG-30189 UI"`, `"skeptic · SG-30189"`, `"coder · SG-30189 api"` — every task, also the next
round given to a reused worker (`worker-start --terminal …`): `"tester · SG-30192 round 13"`, not `"Round 13: …"`. The orchestrator names
its own tab first thing, before the spec: `orca chat rename --name "orchestrator · <name>"` (in a terminal tab:
`orca terminal rename --title "orchestrator · <name>"`). Roles and their titles: `researcher`, `coder`, `reviewer`,
`skeptic` (a reviewer worker refuting issues), `tester` — never "review" / "fix" / the ticket key in front.

## Ticket
The ticket argument is a key (e.g. `SG-30200`), a link (Jira, Figma…) or a text description.
- **Use it only if it can really be read:** for a key / link, read the content with the available tools (Jira, Figma
  skill / connector…). Cannot read it (no tool, not logged in, error) → **stop, tell the user** and ask for a
  description or access; do not guess the requirements from the ticket key. A text description is used directly as the
  requirements.
- **Name from the ticket** (file `.agents/plans/<name>.md`, worktree `<name>-<part>`, worker task titles `<role> · <name> <part>`): for
  a ticket key use the key (`SG-30200`); for a link / description shorten it: strip diacritics (e.g. Vietnamese),
  lowercase, keep only `a-z 0-9` and `-`, other characters become `-`, collapse consecutive `-`, at most 40 characters
  (e.g. "Add Sports tab to Header" → `add-sports-tab-to-header`; "Thêm tab Thể thao" → `them-tab-the-thao`).
  Use **the same name** everywhere within one run.

## Flow
0. **Research** (optional): the user adds `--research`, or the ticket has unclear points. Split into independent
   questions, one `researcher` worker per question on `--worktree current` (read-only), in parallel. Merge the answers
   into the spec; present "Options" for the user to choose if any.
1. **Spec** (the orchestrator does it itself; if `.agents/plans/<ticket>.md` already exists, use that file, see the
   "Plan only" section in `modes.md`): read the ticket (Jira / Figma if tools exist), write the plan: work parts, files
   expected to change, acceptance criteria, and the **run plan** (the "Dependencies" section below) with merge-conflict
   risks, and the **effort** per role (the "Effort" section). New worktrees are created from HEAD: if the current checkout has related uncommitted changes → tell the user
   to commit first, or use `/dev review`. **Ask the user to approve** before moving to step 2 (this also approves the
   local commits in step 2 if the plan has sequential parts).
2. **Code**: per the run plan. One `coder` worker per part, one worktree each:
   `--worktree new-child --name <ticket>-<part>`.
   - A dependent part starts only when the part it needs has **passed review and test (PASS)** — "coder reports done"
     is not enough. Then the orchestrator **commits locally** on that part's branch (no push, no merge; the user
     approved this with the run plan in step 1), then creates the dependent part's worktree from that branch
     (`--base-branch <branch>`).
   - The coder runs build / lint / unit tests itself; it does not use resources reserved for the tester (dev server,
     devices).
3. **Review**: a `reviewer` worker on **the coder's worktree**. If the reviewer is Claude with the ponytail plugin → the
   spec also says "run `/ponytail:ponytail-review` on the diff first". Then follow the "Adversarial review" section
   below.
4. **Test**: **one** `tester` worker, testing each worktree **in turn**. The spec gives worktree + branch and the
   acceptance criteria. With `env` → the tester tests that real environment (URL, its notes) instead of a local
   build, per "Real environment" in the tester role; the spec names the environment and the commit it must run. Code
   not deployed there yet (the usual case in a full `/dev` run) → test locally first, then ask the user whether to
   test the environment once it is deployed.
5. **Acceptance**: summarize for the user (changes, review, test table, the rulings made on the way). With ponytail:
   `/ponytail:ponytail-debt` on each worktree, put the `shortcut:` items in the summary. **Ask the user to approve**,
   offering for each branch: **merge** into its base, **open a PR** (when the repo has a remote and `gh` / `glab`
   works), **keep** the branch for later, or **discard** it. Merge **one branch at a time**, depended-on parts first;
   conflict → stop, tell the user, do not resolve it yourself.
6. **Clean up** (after the user's choice): release the finished workers (`orca orchestration worker-release
   --dispatch <id>`); for merged or discarded branches, offer to remove their worktrees (`orca worktree rm`) and
   branches — ask first, never delete a kept branch or uncommitted work.

## Effort
How hard each worker thinks (Orca's `--effort`): low effort is fast and cheap, high effort misses less. Pick it per
role at step 1, write it in the spec with a one-line reason (e.g. "coder high: changes shared-web"), and let the user's
approval of the spec cover it; the user can change it there ("coder xhigh").
- **Who decides:** `effort: "off"` in team.json → pass no `--effort`. A role with a fixed `effort` → that level. Else
  rate the ticket:
  - **Size:** files / parts expected to change, the ticket's story points or priority when readable, and with the code
    graph the number of places `graphify affected` lists.
  - **Risk:** auth, payments, user data, migrations, code shared per `notes`, concurrency, a bug with no known cause.
- **Levels (Claude names):**

  | Ticket | coder | reviewer / skeptic | researcher | tester |
  |---|---|---|---|---|
  | Small, low risk (copy, style, 1–2 files) | medium | low | – | low |
  | Medium | high | medium | medium | medium |
  | Large or risky | xhigh | high | high | medium |
  | Debug / audit / idea research | high | high | high | medium |

- **Per AI:** Claude low / medium / high / xhigh / max; Codex low / medium / high / xhigh; Antigravity and Cursor up to
  high; OpenCode has none → pass nothing. Use the nearest level the AI takes.
- **Limits:** `--effort` needs `--model` — a role with no `model` gets none unless you pass that AI's usual model
  (Claude `opus` / `sonnet`) too. A reused worker (`--terminal`) keeps the effort it started with: a next round that
  needs another level gets a new worker. The orchestrator's own effort is fixed in team.json (it starts before the
  ticket is read; `high` is a good default).

## Code graph (graphify, optional)
With the `graphify` CLI ([graphify](https://github.com/Graphify-Labs/graphify)), the code's call / import graph answers
"who uses this", "what does changing it touch", "how do A and B connect" faster than grepping. Without it, everything
below falls back to grep and reading. `"codeGraph": false` in `.agents/team.json` turns all of this off.
- **Install on confirm** (the orchestrator, at the start, before any worker; `setup` does the same): `graphify --version`
  fails → ask the user **once**: "Máy chưa có graphify (đồ thị code, chạy tại máy, không gửi code ra ngoài). Cài luôn
  không?" / "graphify (local code graph, nothing leaves the machine) is not installed. Install it now?". Only on a yes:
  1. `uv tool install graphifyy` (PyPI name with double y); no `uv` → `pipx install graphifyy`; neither → install
     uv first (Windows `winget install --id astral-sh.uv -e`, macOS `brew install uv`, Linux
     `curl -LsSf https://astral.sh/uv/install.sh | sh`), then `uv tool install graphifyy`.
  2. `graphify` still not found → it is in uv's tool folder (`uv tool dir --bin`): call it by that path this run and
     tell the user `uv tool update-shell` puts it on PATH for new terminals.
  3. Check with `graphify --version`. Any step fails → report the error, go on without the graph; don't retry.
  A no → go on without it, don't ask again this run, and mention that `"codeGraph": false` stops the question for good.
  Never run `graphify install` (it adds its own hooks to the assistant): super-agents only calls the CLI.
- **Fresh graph** (after the install, or when graphify is already there; the first build of a big repo can take minutes:
  say so, and hand out work that does not need the graph meanwhile): `graphify-out/graph.json` exists →
  `graphify update .`; missing → build it with `graphify extract . --code-only` (parsed locally, nothing sent out, no
  LLM) — part of the same yes when you just installed it, otherwise ask once. Never run a mode that sends docs to an
  outside model unless the user set that up. Do not commit `graphify-out/` unless the repo already does; offer to add
  it to `.gitignore`.
- **Commands:** `graphify affected "<file or symbol>"` (what depends on it), `graphify query "<question>"`,
  `graphify path "<A>" "<B>"`, `graphify explain "<name>"`; subsystems are listed in `graphify-out/GRAPH_REPORT.md`.
- **A lead, not proof:** the graph can be stale or miss dynamic calls; confirm every point it gives by reading the code
  (`file:line`) before it goes into a spec, a finding or a verdict.
- **In each worker's spec:** whether the graph is available and, if so, the **absolute path** of the orchestrator's
  `graphify-out/graph.json`; the worker passes it to every command (`graphify affected "<x>" --graph <path>`), since a
  new worktree has no `graphify-out/` of its own. That graph shows the base code, not the worker's own changes; a
  worker that needs those runs `graphify update .` in its worktree first.

## Dependencies (step 1)
Consider each pair of work parts (with the code graph: `graphify affected` on each part's expected files shows where
they meet). They **must run sequentially** (or be merged into one coder) when any of these signs holds:
- they edit the same file, or the same generated files;
- part B uses a module / API / component that part A creates or changes;
- the ticket says "depends on" / "after" the other part;
- migrations / schema must go in order; shared config, fixtures, global state;
- shared code per the repo's `notes`; two independent coders easily pick different designs for the same thing.

**Default to sequential**, run in parallel only when certainly independent. Small work (under ~15 minutes) runs
sequentially. Do not split work just to have more workers. Write the run plan as: `Parallel 1: [A, B] → after A: [C]`,
with the reason for each sequential point.

## Adversarial review (step 3)
- The reviewer reports only 2 levels: **blocking** (proven bugs: wrong logic, security, data loss, broken API /
  contract) and **suggestion** (style, taste, "should be more complete", redundant code that causes no bug).
  Suggestions **do not open a fix round**, they only go into the summary.
- Blocking issues exist → assign **one skeptic worker** (role `reviewer`, task title `skeptic · <name>`): try to **refute** each blocking issue —
  check the call sites, whether the code is reachable, whether the framework / elsewhere already handles it, whether
  it is only test code. Give each issue a label: `CONFIRMED` (real bug), `DOWNGRADED` (becomes a suggestion),
  `DISPUTED` (dropped), with evidence.
- Only `CONFIRMED` issues are sent to the coder to fix (`send`). The coder fixes minimally, with a test that fails on
  the old bug and passes after the fix.
- Re-review only **checks whether the issues are closed** (closed / not_closed / reopened) and the just-fixed part,
  it does not hunt for new issues.
- Stop the fix rounds when **there is no more progress**: issues do not narrow, only get renamed, agents get swapped,
  unrelated green tests get added → stop, tell the user with evidence. No fixed number of rounds.

## The spec sent to a worker must have
- Read its role file (absolute path) and the relevant `notes` part.
- Scope it may edit (folders), parts it must not touch.
- Done criteria; end with a summary + list of changed files.

## Rules
- Workers **do not commit, do not push**. The orchestrator merges / commits when the user says so; the only exception:
  a local commit on the branch of a PASSED part so a dependent part can continue (step 2).
- At most 3 workers in parallel. Work **in the worktree of an idle worker** (fixing review issues, follow-up on that
  same worktree) goes back to it; other parts open a new worker (`modes.md` → Monitoring).
- A worker asks (`ask`) something not derivable from the spec → ask the user, do not decide yourself.
