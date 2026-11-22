// Rules of the `/super-agents:review --here` guard (the hooks that apply them are in register.tsx: an engine `$` is only
// followed into functions of the same file). While that review runs, no file is edited until the person answers with a
// "sửa …" / "fix …" prompt; the unlock lasts that one turn, the next round asks again. Answers in Vietnamese and English
// are both understood; what the person sees follows the repo's language (i18n.ts).
// It ends by itself: Claude closes the review with DONE_MARKER, the person declines ("không sửa", "bỏ qua"), or the
// person moves on to another slash command. "xong review" / `--off` end it by hand.
// Bash can still write files: this guards the edit tools, the skill's own rule covers the rest.
import { TEXT } from './i18n'
import type { Lang } from './i18n'

export type ReviewGuard = { isActive: boolean; isTurnAllowed: boolean }

const OFF: ReviewGuard = { isActive: false, isTurnAllowed: false }

export const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])

// The edits the lock holds back: every file edit except the audit report (`.agents/audits/…`), which `audit here`
// writes before asking what to fix.
export function isLockedEdit(tool: string, input: unknown): boolean {
  if (!EDIT_TOOLS.has(tool)) return false
  const fields = (input ?? {}) as { file_path?: unknown; notebook_path?: unknown }
  const path = String(fields.file_path ?? fields.notebook_path ?? '')
  // A '..' step could climb out of the folder ('.agents/audits/../../src/a.ts'): such a path stays locked.
  return !/(^|[\\/])\.agents[\\/]audits[\\/]/.test(path) || /(^|[\\/])\.\.([\\/]|$)/.test(path)
}

// The skill tells Claude to end the review's final summary with one of these lines; the guard turns off when it sees it.
export const DONE_MARKERS = ['✅ Review xong', '✅ Review done']
export const DONE_MARKER = DONE_MARKERS[0]

export const DENY_REASON =
  'super-agents here (review / audit): not allowed to edit yet. Show the numbered findings and ask which to fix; edit only after ' +
  'the user answers "sửa …" / "fix …".'

export function guardStatus(state: ReviewGuard, lang: Lang = 'vi'): string | undefined {
  if (!state.isActive) return undefined
  return state.isTurnAllowed ? TEXT[lang].guardOpen : TEXT[lang].guardLocked
}

// The review skill and its audit twin (`/super-agents:audit` asks before fixing the same way).
export function isReviewSkill(skill: string): boolean {
  return /(^|:)(review|audit)$/.test(skill)
}

// Only the start of the answer decides: "sửa 1, bỏ qua 3" fixes 1, "lỗi 2 sửa thế nào?" is a question, not a go-ahead.
const CONFIRMS = /^\s*((ok|okay|yes|đồng ý|được)\s*[,.:]?\s*)?(sửa|fix)(?![\p{L}])/iu
const DECLINES = /^\s*(không\s+sửa|đừng\s+sửa|bỏ\s+qua|skip|ignore|no\s+fix|don'?t\s+fix)(?![\p{L}])/iu

export function confirmsFix(text: string): boolean {
  return CONFIRMS.test(text)
}

export function endsReview(text: string): boolean {
  return /xong review|kết thúc review|done review|end review|finish review/iu.test(text) || DECLINES.test(text)
}

// Another slash command than the review means the person moved on (a pasted path such as /c/Users/… is not one).
export function movesOn(text: string): boolean {
  const command = /^\s*\/([\w:-]+)(?=\s|$)/.exec(text)?.[1]
  return Boolean(command && !isReviewSkill(command))
}

export function finishesReview(answer: string): boolean {
  return DONE_MARKERS.some((marker) => answer.includes(marker))
}

// The guard after the review skill is called with `args` (Skill tool or a typed command): `--here` starts it locked,
// `--off` ends it. Hooks on skill.prompt are bypassed for plugins, so the call is caught at the tool and the prompt.
export function afterReviewCommand(state: ReviewGuard, skill: string, args: string): ReviewGuard {
  // `/super-agents:dev review here …`, and `dev audit here …` (it also asks before fixing), lock like `/review here …`.
  const devReview = /(^|:)dev$/.test(skill) ? /^\s*(?:review|audit)(?=\s|$)([\s\S]*)$/.exec(args) : null
  if (devReview) return afterReviewCommand(state, 'review', devReview[1] ?? '')
  if (!isReviewSkill(skill)) return state
  const mode = reviewMode(args)
  if (mode === 'off') return OFF
  return mode === 'here' ? { isActive: true, isTurnAllowed: false } : state
}

// The mode word of a review call: "here" / "off" as its first word (the old "--here" / "--off" anywhere still count).
export function reviewMode(args: string): 'here' | 'off' | null {
  // A leading `env <name|url>` (the test environment) comes before the mode word too.
  const first = args.trim().replace(/^(--)?env\s+\S+\s*/i, '').split(/\s+/)[0]?.toLowerCase().replace(/^--/, '')
  if (first === 'here' || first === 'off') return first
  if (/--off\b/.test(args)) return 'off'
  return /--here\b/.test(args) ? 'here' : null
}

// A typed "/super-agents:review …", "/review …" or "/super-agents:dev review | audit …": the skill and its arguments, else null.
export function typedReviewCommand(text: string): { skill: string; args: string } | null {
  const match = /^\s*\/([\w-]+:)?(review|audit|dev)(?=\s|$)([\s\S]*)$/.exec(text)
  if (!match) return null
  const skill = `${match[1] ?? ''}${match[2]}`
  const args = match[3] ?? ''
  return match[2] === 'dev' && !/^\s*(?:review|audit)(?=\s|$)/.test(args) ? null : { skill, args }
}

// The guard after the person's prompt: "sửa …" opens this turn, a decline / another command / "xong review" ends it,
// anything else keeps it locked.
export function afterPrompt(state: ReviewGuard, text: string): ReviewGuard {
  const command = typedReviewCommand(text)
  if (command) return afterReviewCommand(state, command.skill, command.args)
  if (!state.isActive) return state
  if (endsReview(text) || movesOn(text)) return OFF
  return { isActive: true, isTurnAllowed: confirmsFix(text) }
}

// The guard after a main-loop turn: off once Claude closed the review, locked again after a fix turn.
export function afterTurn(state: ReviewGuard, answer: string): ReviewGuard {
  if (!state.isActive) return state
  if (finishesReview(answer)) return OFF
  return state.isTurnAllowed ? { isActive: true, isTurnAllowed: false } : state
}

// The dim prompt suggestion (Tab takes it) after a main-loop turn while the review runs. Null once it ended.
export function suggestionAfterTurn(stateBefore: ReviewGuard, answer: string, lang: Lang = 'vi'): string | null {
  if (!stateBefore.isActive || finishesReview(answer)) return null
  return stateBefore.isTurnAllowed ? TEXT[lang].suggestDone : TEXT[lang].suggestFix
}
