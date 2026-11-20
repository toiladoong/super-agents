// Rules of the `/super-agents:review --here` guard (the hooks that apply them are in register.tsx: an engine `$` is only
// followed into functions of the same file). While that review runs, no file is edited until the person answers with a
// "sửa …" prompt; the unlock lasts that one turn, the next round asks again.
// It ends by itself: Claude closes the review with DONE_MARKER, the person declines ("không sửa", "bỏ qua"), or the
// person moves on to another slash command. "xong review" / `--off` end it by hand.
// Bash can still write files: this guards the edit tools, the skill's own rule covers the rest.
export type ReviewGuard = { isActive: boolean; isTurnAllowed: boolean }

const OFF: ReviewGuard = { isActive: false, isTurnAllowed: false }

export const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])

// The skill tells Claude to end the review's final summary with this line; the guard turns off when it sees it.
export const DONE_MARKER = '✅ Review xong'

export const DENY_REASON =
  'super-agents review --here: chưa được sửa. Báo bảng lỗi đánh số và hỏi user sửa lỗi nào; chỉ sửa sau khi user trả lời "sửa …".'

export function guardStatus(state: ReviewGuard): string | undefined {
  if (!state.isActive) return undefined
  return state.isTurnAllowed
    ? '✏️ review --here: đang sửa các lỗi đã chọn'
    : '🔒 review --here: chưa sửa file — trả lời "sửa 1, 3" / "sửa hết lỗi chặn" để cho phép'
}

export function isReviewSkill(skill: string): boolean {
  return /(^|:)review$/.test(skill)
}

const DECLINES = /không\s+sửa|đừng\s+sửa|bỏ\s+qua/iu

export function confirmsFix(text: string): boolean {
  return /(^|[^\p{L}])(sửa|fix)([^\p{L}]|$)/iu.test(text) && !DECLINES.test(text) && !/chưa\s+sửa/iu.test(text)
}

export function endsReview(text: string): boolean {
  return /xong review|kết thúc review|--off\b/iu.test(text) || DECLINES.test(text)
}

// Another slash command than the review means the person moved on.
export function movesOn(text: string): boolean {
  const command = /^\s*\/([\w:-]+)/.exec(text)?.[1]
  return Boolean(command && !isReviewSkill(command))
}

export function finishesReview(answer: string): boolean {
  return answer.includes(DONE_MARKER)
}

// The guard after the review skill is called with `args` (Skill tool or a typed command): `--here` starts it locked,
// `--off` ends it. Hooks on skill.prompt are bypassed for plugins, so the call is caught at the tool and the prompt.
export function afterReviewCommand(state: ReviewGuard, skill: string, args: string): ReviewGuard {
  if (!isReviewSkill(skill)) return state
  if (/--off\b/.test(args)) return OFF
  return /--here\b/.test(args) ? { isActive: true, isTurnAllowed: false } : state
}

// A typed "/super-agents:review …" (or "/review …"): the skill and its arguments, else null.
export function typedReviewCommand(text: string): { skill: string; args: string } | null {
  const match = /^\s*\/([\w-]+:)?(review)\b([\s\S]*)$/.exec(text)
  return match ? { skill: `${match[1] ?? ''}${match[2]}`, args: match[3] ?? '' } : null
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
export function suggestionAfterTurn(stateBefore: ReviewGuard, answer: string): string | null {
  if (!stateBefore.isActive || finishesReview(answer)) return null
  return stateBefore.isTurnAllowed ? 'xong review' : 'sửa hết lỗi chặn'
}
