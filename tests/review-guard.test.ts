import { expect, test } from 'claude-code/testing'

import { DONE_MARKER, afterReviewCommand, reviewMode, confirmsFix, endsReview, isReviewSkill, movesOn, suggestionAfterTurn, typedReviewCommand } from '../hooks/review-guard'

test('reads the person’s answer', async () => {
  expect(confirmsFix('sửa 1, 3')).toBe(true)
  expect(confirmsFix('ok sửa hết lỗi chặn')).toBe(true)
  expect(confirmsFix('không sửa')).toBe(false)
  expect(confirmsFix('chưa sửa, giải thích lỗi 2')).toBe(false)
  expect(confirmsFix('lỗi 2 là gì?')).toBe(false)
  expect(endsReview('xong review')).toBe(true)
  expect(confirmsFix('lỗi 2 sửa thế nào?')).toBe(false)
  expect(confirmsFix('sửa 1, bỏ qua 3')).toBe(true)
  expect(endsReview('sửa 1, bỏ qua 3')).toBe(false)
  expect(confirmsFix('đồng ý, sửa hết')).toBe(true)
  expect(movesOn('/c/Users/doong/a.ts lỗi ở đây')).toBe(false)
  expect(typedReviewCommand('/review-ui x')).toBeNull()
  expect(typedReviewCommand('/super-agents:dev status')).toBeNull()
  expect(endsReview('không sửa')).toBe(true)
  expect(endsReview('bỏ qua hết')).toBe(true)
  expect(endsReview('chưa sửa, giải thích lỗi 2')).toBe(false)
  expect(movesOn('/office')).toBe(true)
  expect(movesOn('/super-agents:review --here')).toBe(false)
  expect(movesOn('sửa 1')).toBe(false)
  expect(isReviewSkill('super-agents:review')).toBe(true)
  expect(isReviewSkill('ponytail:ponytail-review')).toBe(false)
  expect(typedReviewCommand('/super-agents:review --here SG-1')).toEqual({ skill: 'super-agents:review', args: ' --here SG-1' })
  expect(typedReviewCommand('sửa 1')).toBeNull()
  const off = { isActive: false, isTurnAllowed: false }
  expect(afterReviewCommand(off, 'super-agents:review', '--here')).toEqual({ isActive: true, isTurnAllowed: false })
  expect(afterReviewCommand({ isActive: true, isTurnAllowed: false }, 'super-agents:review', '--off')).toEqual(off)
  expect(afterReviewCommand(off, 'super-agents:dev', '--here')).toEqual(off)
  expect(reviewMode('here SG-1')).toBe('here')
  expect(reviewMode(' off')).toBe('off')
  expect(reviewMode('--here SG-1')).toBe('here')
  expect(reviewMode('SG-1 --here')).toBe('here')
  expect(reviewMode('SG-1 click here')).toBeNull()
  expect(afterReviewCommand(off, 'super-agents:review', 'here')).toEqual({ isActive: true, isTurnAllowed: false })
  expect(afterReviewCommand(off, 'super-agents:dev', 'review here SG-1')).toEqual({ isActive: true, isTurnAllowed: false })
  expect(afterReviewCommand(off, 'super-agents:dev', 'plan here SG-1')).toEqual(off)
})

test('edits wait for "sửa …" during review --here, one turn at a time', async ($, on) => {
  // The engine beneath the plugin: tool checks allow, prompts and turns pass.
  on('tool.check', async () => ({ decision: 'allow' as const }))
  on('prompt.submit', async ($, e) => e as never)
  on('turn.complete', async ($, e) => ({ text: e.answer }))
  const edit = () => $.tool.check({ tool: 'Edit', input: { file_path: 'a.ts', old_string: 'a', new_string: 'b' } })
  await $.prompt.submit({ text: '/super-agents:review here' })
  expect((await edit()).decision).toBe('deny')
  await $.prompt.submit({ text: 'sửa 1' })
  expect((await edit()).decision).not.toBe('deny')
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as never)
  expect((await edit()).decision).toBe('deny')
  await $.prompt.submit({ text: 'sửa 2' })
  await $.turn.complete({ answer: `Nghiệm thu …
${DONE_MARKER}`, durationMs: 1, isAborted: false, turnId: 't2', reason: 'answer' } as never)
  expect((await edit()).decision).not.toBe('deny')
  await $.prompt.submit({ text: '/super-agents:review here' })
  expect((await edit()).decision).toBe('deny')
  await $.prompt.submit({ text: '/office' })
  expect((await edit()).decision).not.toBe('deny')
})

test('suggests the next answer while the review runs', async () => {
  expect(suggestionAfterTurn({ isActive: true, isTurnAllowed: false }, 'Bảng lỗi …')).toBe('sửa hết lỗi chặn')
  expect(suggestionAfterTurn({ isActive: true, isTurnAllowed: true }, 'Đã sửa 1, 3')).toBe('xong review')
  expect(suggestionAfterTurn({ isActive: true, isTurnAllowed: true }, `Tóm tắt
${DONE_MARKER}`)).toBeNull()
  expect(suggestionAfterTurn({ isActive: false, isTurnAllowed: false }, '')).toBeNull()
})

test('during review --here the after-turn suggestion (what Orca shows) is the review’s next answer', async ($, on) => {
  let shown = ''
  on('prompt.submit', async ($, e) => e as never)
  on('turn.complete', async ($, e) => ({ text: e.answer }))
  on('prompt.suggest', async ($, e) => {
    shown = e.text
    return { isShown: true }
  })
  const endTurn = (answer: string) =>
    $.turn.complete({ answer, durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' } as never)
  await $.prompt.submit({ text: '/super-agents:review here' })
  await endTurn('Bảng lỗi …')
  await $.prompt.suggest({ text: 'engine guess' })
  expect(shown).toBe('sửa hết lỗi chặn')
  await endTurn(`Nghiệm thu\n${DONE_MARKER}`)
  await $.prompt.suggest({ text: 'engine guess' })
  expect(shown).toBe('engine guess')
})
