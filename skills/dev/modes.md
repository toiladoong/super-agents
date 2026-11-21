# Secondary modes of /dev

## Research only: `/dev research <question or ticket>`
Run only step 0, no code. The orchestrator splits the questions, assigns researchers, then gives the user one merged
report: answers, evidence (`file:line`, links), the options and the recommended option, what is still uncertain. If the
user wants to continue → run the full flow from step 1 with this result.

## Plan only: `/dev plan [here] [--research] <ticket or description>`
Run step 0 (if needed) and step 1 then **stop**: create no coder / reviewer / tester workers, edit no code.
- The plan follows step 1 exactly (work parts, files expected to change, acceptance criteria, run plan + dependencies,
  merge risks), written to `.agents/plans/<name>.md` at the repo root (name per the "Ticket" section in `SKILL.md`).
  The file header gives: ticket, date, branch / commit at planning time, status `chờ duyệt` / `pending`.
- Ask the user to approve; if the user edits, update the file. Once approved, change the status to `đã duyệt` /
  `approved`. Do not commit the file until the user says so.
- `here`: do not open an orchestrator tab, this tab does the work (research via subagents if needed).
- Tell the user: run `/dev <ticket>` to carry out this plan.

Write statuses in the configured `language` (Vietnamese or English form); both forms are understood when reading.

**`/dev <ticket>` when `.agents/plans/<ticket>.md` already exists:** read the file instead of steps 0–1; if the branch /
commit has changed a lot, re-check that the files expected to change are still right. Status `đã duyệt` / `approved` →
ask the user one confirmation question ("follow this plan?") then go to step 2; `chờ duyệt` / `pending` → approve as in
step 1. After acceptance, write status `đã làm` / `done` into the file.

## Code already written: `/dev review <ticket> [branch]`
Skip the Code step, start from Review on the written code.
- **Where it runs:** no `branch` → the uncommitted changes in the current checkout, every worker uses
  `--worktree current` (a new worktree would not have the uncommitted changes). With `branch` → the worktree that has
  that branch open (`orca worktree list`), if none, create it with `--worktree new-child --base-branch <branch>`.
- **Spec:** rewrite it from `git diff` (+ ticket if any): what changed, which parts, acceptance criteria. **Ask the user
  to approve.**
- **Review → fix:** reviewer as in step 3. Blocking issues → one `coder` worker fixes on **that worktree**; if it is
  `current`, tell the user not to edit by hand at the same time. After the fix, review again.
- **Test, acceptance:** as in steps 4, 5. For code in `current`, a dev server already running from this checkout can be
  used as is.

## Monitoring: `/dev status`
Runs in any session (does not open an orchestrator tab). Gather from:
- `orca orchestration task-list` — each worker's work and task status.
- `orca orchestration worker-list` — whether each worker's terminal is still alive (`active`, `reclaimable`, `retained`,
  `released`).
- `orca worktree ps` — worktrees, branches, running agents.

Report one table: worker (role + work part), worktree / branch, status, current / just-finished work.
- **Busy:** task running, terminal `active`.
- **Idle:** task done (`worker_done`) but the terminal is still open (`reclaimable` / `retained`) — can take new work.
- **Waiting:** in an `ask` or blocked by another task (`--deps`) — state clearly what it waits for.
- **Closed:** `released` — cannot be used any more.

Assigning new work: work **in the worktree of an idle worker** (fixing review issues, continuing on that same worktree)
→ reuse that worker (`worker-start --terminal <its handle>`). Another part needing its own worktree → open a new worker
(do not stuff it into another part's worktree), while there are fewer than 3 workers.

## In one tab: `here` (e.g. `/dev review here [ticket] [branch]`, `/review here`)
Do not open an orchestrator tab, create no Orca workers: **the running tab is the orchestrator**, the roles run as
**Claude Code subagents** (Agent tool) right in the tab, results come back to the tab. Claude only (ignore non-Claude
`agent` / `model` in `team.json`; its `language` still applies; pass a Claude model via the Agent tool's `model`
parameter if any). Each subagent's `description` starts with its role, as the `/office` pane reads it:
`reviewer · <part>`, `skeptic · <name>`, `coder · <fix>`, `tester · <name>`.
- **Spec:** as usual (from `git diff` / ticket), **ask the user to approve**.
- **Review:** one reviewer subagent (`subagent_type` is the repo's reviewer agent if `notes` points to one, e.g.
  `web-reviewer`; otherwise `general-purpose`), prompt: "read `<SKILL_DIR>/roles/reviewer.md` and follow it", with the
  diff / scope and the relevant `notes` part. Large diff → split by module, several subagents in parallel (at most 3).
- **Skeptic:** blocking issues exist → another subagent, prompt "act as skeptic per `roles/reviewer.md`" with the list
  of blocking issues.
- **Confirm before fixing (mandatory):** after the review **end the turn**, report a numbered issue table (`CONFIRMED`
  blocking first, suggestions after; each issue with `file:line`, why, how to fix) and ask which to fix (e.g.
  "sửa 1, 3" / "fix 1, 3", "sửa hết lỗi chặn" / "fix all blocking", "không sửa" / "skip").
  **Edit no file** until the user answers; silence or an unclear answer = no fix. Each later fix round asks again.
  In Claude Code, the plugin's mod hard-blocks Edit / Write until the user answers "sửa …" / "fix …" (unlocks that
  turn only; `off` or "xong review" / "done review" turns it off; the lock also turns off on its own when it sees the
  line `✅ Review xong` / `✅ Review done`, when the user answers "không sửa" / "skip" or "bỏ qua" / "ignore", or when
  the user types another `/…` command); if refused, report the issue table and ask, do not retry or fix via Bash.
- **Fix:** only the issues the user picked. This tab fixes them itself (per `roles/coder.md`: minimal, with a
  reproducing test); then one subagent re-reviews, only checking whether the issues are closed. Stop when there is no
  more progress.
- **Test:** a tester subagent (the repo's tester agent if any, e.g. `web-tester`) or the tab tests itself per
  `roles/tester.md`.
- **Acceptance:** summarize as in step 5. Do not commit until the user says so. The acceptance reply (review finished:
  no remaining issues the user chose to fix, or the user chose not to fix) **ends with exactly one line**:
  `✅ Review xong` (Vietnamese) or `✅ Review done` (English) per the reply language; the plugin's mod sees this line
  and turns off the edit lock on its own. Print this line only at the end of the whole review, not after each round.
- The general rules still hold: blocking / suggestion, only `CONFIRMED` gets fixed, tester resources one job at a time.
