import { expect, test } from 'claude-code/testing'

import { DONE_MARKER, confirmsFix, endsReview, isReviewSkill, movesOn, suggestionAfterTurn } from '../hooks/review-guard'

test('reads the person’s answer', async () => {
  expect(confirmsFix('sửa 1, 3')).toBe(true)
  expect(confirmsFix('ok sửa hết lỗi chặn')).toBe(true)
  expect(confirmsFix('không sửa')).toBe(false)
  expect(confirmsFix('chưa sửa, giải thích lỗi 2')).toBe(false)
  expect(confirmsFix('lỗi 2 là gì?')).toBe(false)
  expect(endsReview('xong review')).toBe(true)
  expect(endsReview('không sửa')).toBe(true)
  expect(endsReview('bỏ qua hết')).toBe(true)
  expect(endsReview('chưa sửa, giải thích lỗi 2')).toBe(false)
  expect(movesOn('/office')).toBe(true)
  expect(movesOn('/super-agents:review --here')).toBe(false)
  expect(movesOn('sửa 1')).toBe(false)
  expect(isReviewSkill('super-agents:review')).toBe(true)
  expect(isReviewSkill('ponytail:ponytail-review')).toBe(false)
})

test('edits wait for "sửa …" during review --here, one turn at a time', async ($, on) => {
  // The engine beneath the plugin: skills keep their text, tool checks allow, prompts and turns pass.
  on('skill.prompt', async ($, e) => ({ text: e.text }))
  on('tool.check', async () => ({ decision: 'allow' as const }))
  on('prompt.submit', async ($, e) => e as never)
  on('turn.complete', async ($, e) => ({ text: e.answer }))
  const edit = () => $.tool.check({ tool: 'Edit', input: { file_path: 'a.ts', old_string: 'a', new_string: 'b' } })
  await $.skill.prompt({ skill: 'super-agents:review', text: 'ARGUMENTS: --here' })
  expect((await edit()).decision).toBe('deny')
  await $.prompt.submit({ text: 'sửa 1' })
  expect((await edit()).decision).not.toBe('deny')
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as never)
  expect((await edit()).decision).toBe('deny')
  await $.prompt.submit({ text: 'sửa 2' })
  await $.turn.complete({ answer: `Nghiệm thu …
${DONE_MARKER}`, durationMs: 1, isAborted: false, turnId: 't2', reason: 'answer' } as never)
  expect((await edit()).decision).not.toBe('deny')
  await $.skill.prompt({ skill: 'super-agents:review', text: 'ARGUMENTS: --here' })
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
  on('skill.prompt', async ($, e) => ({ text: e.text }))
  on('turn.complete', async ($, e) => ({ text: e.answer }))
  on('prompt.suggest', async ($, e) => {
    shown = e.text
    return { isShown: true }
  })
  const endTurn = (answer: string) =>
    $.turn.complete({ answer, durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' } as never)
  await $.skill.prompt({ skill: 'super-agents:review', text: 'ARGUMENTS: --here' })
  await endTurn('Bảng lỗi …')
  await $.prompt.suggest({ text: 'engine guess' })
  expect(shown).toBe('sửa hết lỗi chặn')
  await endTurn(`Nghiệm thu\n${DONE_MARKER}`)
  await $.prompt.suggest({ text: 'engine guess' })
  expect(shown).toBe('engine guess')
})
