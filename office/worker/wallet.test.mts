import assert from 'node:assert/strict'
import { test } from 'node:test'

import { CHECK_IN_COINS, CHECK_IN_MAX, NEW_WALLET, RUN_COINS, START_COINS, TASK_COINS, checkIn, checkInCoins, liveStreak, previousDay, reward, spend } from './wallet'

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

test('a daily check-in pays 10, 5 more each day in a row up to 50, once a day; a missed day starts over', () => {
  const day1 = checkIn(NEW_WALLET, '2026-11-30')
  assert.equal(day1?.earned, CHECK_IN_COINS)
  assert.equal(checkIn(day1!.wallet, '2026-11-30'), null)
  const day2 = checkIn(day1!.wallet, '2026-12-01')
  assert.equal(day2?.earned, CHECK_IN_COINS + 5)
  assert.equal(day2?.wallet.streak, 2)
  assert.equal(liveStreak(day2!.wallet, '2026-12-02'), 2)
  assert.equal(liveStreak(day2!.wallet, '2026-12-03'), 0)
  assert.equal(checkIn(day2!.wallet, '2026-12-03')?.earned, CHECK_IN_COINS)
  assert.equal(checkInCoins(30), CHECK_IN_MAX)
  assert.equal(previousDay('2024-03-01'), '2024-02-29')

  // Coins from finished work keep the streak.
  const paid = reward(day2!.wallet, [{ id: 'run_b', tasks: [{ id: 't', status: 'completed' }] }]).wallet
  assert.equal(paid.streak, 2)
  assert.equal(paid.checkedInOn, '2026-12-01')
})

test('spending needs enough coins and a whole, positive price', () => {
  assert.equal(spend(NEW_WALLET, START_COINS)?.coins, 0)
  assert.equal(spend(NEW_WALLET, START_COINS + 1), null)
  assert.equal(spend(NEW_WALLET, -5), null)
  assert.equal(spend(NEW_WALLET, Number.NaN), null)
})
