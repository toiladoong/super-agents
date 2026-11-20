// Rules of the `/super-agents:review --here` guard (the hooks that apply them are in register.tsx: an engine `$` is only
// followed into functions of the same file). While that review runs, no file is edited until the person answers with a
// "sửa …" prompt; the unlock lasts that one turn, the next round asks again. `--off` or "xong review" ends it.
// Bash can still write files: this guards the edit tools, the skill's own rule covers the rest.
export type ReviewGuard = { isActive: boolean; isTurnAllowed: boolean }

export const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])

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

export function confirmsFix(text: string): boolean {
  return /(^|[^\p{L}])(sửa|fix)([^\p{L}]|$)/iu.test(text) && !/không\s+sửa|đừng\s+sửa|chưa\s+sửa/iu.test(text)
}

export function endsReview(text: string): boolean {
  return /xong review|kết thúc review|--off\b/iu.test(text)
}

// The guard after a skill prompt: `--here` on a review starts it locked, `--off` ends it.
export function afterSkillPrompt(state: ReviewGuard, skill: string, text: string): ReviewGuard {
  if (!isReviewSkill(skill)) return state
  if (endsReview(text)) return { isActive: false, isTurnAllowed: false }
  return /--here\b/.test(text) ? { isActive: true, isTurnAllowed: false } : state
}

// The guard after the person's prompt: "sửa …" opens this turn, anything else keeps it locked, "xong review" ends it.
export function afterPrompt(state: ReviewGuard, text: string): ReviewGuard {
  if (!state.isActive) return state
  if (endsReview(text)) return { isActive: false, isTurnAllowed: false }
  return { isActive: true, isTurnAllowed: confirmsFix(text) }
}
