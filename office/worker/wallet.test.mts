import assert from 'node:assert/strict'
import { test } from 'node:test'

import { NEW_WALLET, RUN_COINS, START_COINS, TASK_COINS, reward, spend } from './wallet'

test('finished Orca work pays once: each completed task, and a ticket bonus when its whole Run is done', () => {
  const running = { id: 'run_a', tasks: [{ id: 't1', status: 'completed' }, { id: 't2', status: 'running' }] }
  const first = reward(NEW_WALLET, [running])
  assert.equal(first.earned, TASK_COINS)
  assert.equal(reward(first.wallet, [running]).earned, 0)

  const done = { id: 'run_a', tasks: [{ id: 't1', status: 'completed' }, { id: 't2', status: 'completed' }] }
  const second = reward(first.wallet, [done])
  assert.equal(second.earned, TASK_COINS + RUN_COINS)
  assert.deepEqual(second.wallet.paidRuns, ['run_a'])
  assert.deepEqual(second.wallet.paidTasks, {})
  assert.equal(reward(second.wallet, [done]).earned, 0)
  assert.equal(second.wallet.coins, START_COINS + 2 * TASK_COINS + RUN_COINS)

  assert.equal(reward(NEW_WALLET, [{ id: 'run_empty', tasks: [] }]).earned, 0)
})

test('spending needs enough coins and a whole, positive price', () => {
  assert.equal(spend(NEW_WALLET, START_COINS)?.coins, 0)
  assert.equal(spend(NEW_WALLET, START_COINS + 1), null)
  assert.equal(spend(NEW_WALLET, -5), null)
  assert.equal(spend(NEW_WALLET, Number.NaN), null)
})
