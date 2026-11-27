# Secondary modes of /dev

## Research only: `/dev research [here] [idea] <question, ticket or idea>`
Run only step 0, no code. The orchestrator splits the questions, assigns researchers, then gives the user one merged
report: answers, evidence (`file:line`, links), the options and the recommended option, what is still uncertain. If the
user wants to continue → run the full flow from step 1 with this result.
- `here`: the same in this tab with researcher subagents (`description` `researcher · <question>`; the skeptic
  `skeptic · idea <name>`), using subagents as in "In one tab" but without its spec approval, fix step or closing
  line: research changes no code.

### Is the idea worth it: `/dev research [here] idea <idea>`
Also when the user asks whether something is worth doing ("có nên…", "should we…", "đáng làm không"). The goal is a
decision backed by evidence, not a plan. Nothing is coded.
- **Frame it** (the orchestrator, before any worker): restate the idea in 1–2 sentences, who it is for, and what
  "worth it" means here (the gain the user expects, the budget / time they would spend). Unclear → ask the user first.
- **Three researchers in parallel** (task titles `researcher · idea <lens>`), each per the "Evaluating an idea" section
  of `roles/researcher.md`, one lens each:
  1. **Need / value** — is the problem real and how big: who hits it, how often, what it costs them now (repo issues /
     TODOs / tickets, usage in the code, the user's words, the web: demand, how others solve it).
  2. **Cost / feasibility** — what it touches in this repo, size (S / M / L with reasons), dependencies, risks, the
     upkeep after, and the smallest version that would still prove the value.
  3. **Alternatives** — doing nothing, a smaller version, an existing tool / library / product / setting that already
     does it, and what each costs.
- **Skeptic** (one more researcher, after the three report; task title `skeptic · idea <name>`): argue against the
  case — attack the strongest claims and the numbers, look for counter-evidence. Label each claim `STANDS` / `WEAK` /
  `UNSUPPORTED`.
- **Report** to the user, saved to `.agents/research/<YYYY-MM-DD>-<name>.md` (not committed until the user says so):
  1. **Verdict:** `Theo đuổi` / `Làm bản nhỏ trước` / `Chờ thêm bằng chứng` / `Bỏ` (English: Pursue / Start small /
     Wait for evidence / Drop), with confidence (high / medium / low) and the 2–3 facts it rests on.
  2. **Evidence table:** claim · for or against · source (`file:line`, link + date read, ticket, command output) ·
     strength (strong: measured or primary source; medium: credible second-hand; weak: opinion or guess) · skeptic label.
  3. **Value vs cost** in a few lines; the biggest risks; what is still unknown.
  4. **Cheapest next step** that settles the biggest unknown (a spike, a prototype, asking users, a measurement), with
     what result would mean go / stop.
  No evidence for a point → write "chưa rõ" / "unknown"; never invent numbers, users or market sizes.
- **Next:** the user decides. To go ahead → `/dev plan <idea>` with this report as input.

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

## Debug a bug: `/dev debug [here] <bug, ticket or error>`
Find the root cause before any fix; a fix without a known cause is a guess.
1. **Reproduce and collect:** the exact steps, the error / stack, the runtime logs (the repo's rules may require them
   before any assumption), when it started (`git log` / `git bisect` on the suspect range), what changed. Can't
   reproduce → say what is missing and ask the user; don't fix blind. Reproducing needs the dev server, a device or a
   real environment (resources only the tester uses, per the repo's `notes`) → hand this step to one `tester` worker
   (task title `tester · debug repro`): the steps, logs, screenshots; the researchers work from that and ask the tester
   to run it again when a hypothesis needs it.
2. **Hypotheses:** list the likely causes (at most 3), each with what would prove or rule it out (with the code graph,
   `graphify path "<entry point>" "<failing piece>"` shows the route the bug can take). One `researcher`
   worker per hypothesis on `--worktree current` (read-only, task title `researcher · debug <hypothesis>`): read the
   code path, compare with similar code that works, run the reproduction. Each reports proven / ruled out with
   evidence.
   **Until the user approves the fix, no project file is edited** (the user's uncommitted work lives in this
   checkout): reproduction scripts, temporary logging wrappers and their output go only in `.agents/debug/` (the
   `here` lock lets that folder through), and are deleted when the run ends.
3. **Root cause report:** the cause (`file:line`), the evidence, why the other hypotheses are ruled out, and the
   proposed fix (the smallest at the root, not a patch over the symptom). **Ask the user to approve** before fixing.
4. **Fix:** a `coder` writes a test that fails on the bug first, then fixes the cause, with evidence (the test red
   before, green after); then review and test as in steps 3–4 of the flow. Three fixes that did not hold → stop: the
   cause or the design is wrong, report and ask the user instead of trying a fourth.
- **`here`:** the same in this tab with subagents per "In one tab"; the plugin's mod locks the edit tools for
  `debug here` until the user answers "sửa …" / "fix …" to the root cause report, and the run closes with
  `✅ Review xong` / `✅ Review done`.

## Audit the repo: `/dev audit [here] [path …]`
A read-only health check of the code as it is (no diff): bugs, security holes, what breaks under real load, risky code
without tests, slow paths, and what to delete / merge / split. **Fix nothing in this mode.**
- **Scope:** the given paths, else the whole repo, skipping generated / vendored files (`node_modules`, `dist`,
  `build`, lockfiles). Name the run after the scope (`audit-<paths or repo>`, per the "Ticket" naming rule).
- **Split:** with the code graph, split along its subsystems (`graphify-out/GRAPH_REPORT.md`), they keep code that calls
  each other together; otherwise count the tracked files per top-level folder (`git ls-files`), then group the folders into at most 3 parts
  of similar size, keeping the shared code (per `notes`) with its main users. Under ~200 files → one part. A part still
  over ~300 files is split again by its subfolders; if that needs more than 3 parts, stop and ask the user to narrow the
  scope (e.g. `/dev audit webApp/`) or to run the groups one after another — never give one reviewer a part it cannot
  read in full. One `reviewer` worker per part on `--worktree current` (read-only), task title
  `reviewer · audit <part>`.
- **Each reviewer:** per the "Audit" section of `roles/reviewer.md` — Claude with the ponytail plugin runs
  `/ponytail:ponytail-audit` on its part first, then adds the repo's own rules.
- **Skeptic:** blocking findings exist → one skeptic worker, as in the "Adversarial review" section.
- **Report:** merge the parts, drop duplicates, rank (`CONFIRMED` blocking first, then suggestions; the same issue in
  several places is one finding listing the places). Save it to `.agents/audits/<YYYY-MM-DD>-<name>.md` (do not commit
  until the user says so), show the numbered table and ask which to fix (e.g. "sửa 1, 3" / "fix 1, 3").
- **Fixing:** the chosen findings become the ticket of a normal run from step 1 (spec → the user approves → coder per
  part → review → test). Nothing is fixed without that approval.
- **`here`:** the same in this tab with subagents per "In one tab" (at most 3 reviewer subagents in parallel, each with
  `description` `reviewer · audit <part>`). Fixing then follows that section too, not a new run: **confirm before
  fixing** ("sửa …" / "fix …"; the plugin's mod locks the edit tools for `dev audit here` as for `review here`), a
  re-review of the fixed findings, and the closing line `✅ Review xong` / `✅ Review done`.

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
