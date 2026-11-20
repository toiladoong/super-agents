import { expect, test } from 'claude-code/testing'

import { confirmsFix, endsReview, isReviewSkill } from '../hooks/review-guard'

test('reads the person’s answer', async () => {
  expect(confirmsFix('sửa 1, 3')).toBe(true)
  expect(confirmsFix('ok sửa hết lỗi chặn')).toBe(true)
  expect(confirmsFix('không sửa')).toBe(false)
  expect(confirmsFix('chưa sửa, giải thích lỗi 2')).toBe(false)
  expect(confirmsFix('lỗi 2 là gì?')).toBe(false)
  expect(endsReview('xong review')).toBe(true)
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
  await $.prompt.submit({ text: 'xong review' })
  expect((await edit()).decision).not.toBe('deny')
})
