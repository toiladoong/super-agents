// The pet corner's coins: earned when Orca orchestration work finishes, spent on pets, plants, food and water.
// Each Orca Run is one ticket; each of its tasks is one worker's job. Every task and Run pays once.

export const TASK_COINS = 10
export const RUN_COINS = 30 // a ticket done: every task of its Run completed
export const START_COINS = 30

export type Wallet = {
  coins: number
  // Tasks already paid, per Run not finished yet; a finished Run moves to `paidRuns` and its tasks are dropped.
  paidTasks: Record<string, string[]>
  paidRuns: string[]
}
export type RunTasks = { id: string; tasks: { id: string; status: string }[] }

export const NEW_WALLET: Wallet = { coins: START_COINS, paidTasks: {}, paidRuns: [] }

// The wallet after paying what finished in `runs` (Runs not paid yet), and the coins earned.
export function reward(wallet: Wallet, runs: RunTasks[]): { wallet: Wallet; earned: number } {
  let earned = 0
  const paidTasks = { ...wallet.paidTasks }
  const paidRuns = [...wallet.paidRuns]
  for (const run of runs) {
    if (paidRuns.includes(run.id)) continue
    const paid = new Set(paidTasks[run.id] ?? [])
    for (const task of run.tasks) {
      if (task.status !== 'completed' || paid.has(task.id)) continue
      paid.add(task.id)
      earned += TASK_COINS
    }
    if (run.tasks.length && run.tasks.every((task) => task.status === 'completed')) {
      earned += RUN_COINS
      paidRuns.push(run.id)
      delete paidTasks[run.id]
    } else if (paid.size) {
      paidTasks[run.id] = [...paid]
    }
  }
  return { wallet: { coins: wallet.coins + earned, paidTasks, paidRuns }, earned }
}

// The wallet after paying `cost`, or null when there are not enough coins.
export function spend(wallet: Wallet, cost: number): Wallet | null {
  if (!Number.isInteger(cost) || cost < 0 || cost > wallet.coins) return null
  return { ...wallet, coins: wallet.coins - cost }
}
