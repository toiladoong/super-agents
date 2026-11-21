// The pet corner's coins: earned when Orca orchestration work finishes, spent on pets, plants, food and water.
// Each Orca Run is one ticket; each of its tasks is one worker's job. Every task and Run pays once.

export const TASK_COINS = 10
export const RUN_COINS = 30 // a ticket done: every task of its Run completed
export const START_COINS = 30
// Daily check-in: 10 coins, 5 more for each day in a row, at most 50.
export const CHECK_IN_COINS = 10
export const STREAK_STEP = 5
export const CHECK_IN_MAX = 50

export type Wallet = {
  coins: number
  // Tasks already paid, per Run not finished yet; a finished Run moves to `paidRuns` and its tasks are dropped.
  paidTasks: Record<string, string[]>
  paidRuns: string[]
  // The last check-in day ('YYYY-MM-DD', this machine's time zone) and how many days in a row it closed.
  checkedInOn?: string
  streak?: number
}

// Orca task statuses that end a task (still to do: pending, ready, dispatched, blocked, or any status Orca adds).
const DONE_STATUSES = new Set(['completed', 'failed'])

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
    // A Run with no task left to do is settled: never asked about again, and the ticket bonus only when all succeeded
    // (a cancelled task is `failed`).
    if (run.tasks.length && run.tasks.every((task) => DONE_STATUSES.has(task.status))) {
      if (run.tasks.every((task) => task.status === 'completed')) earned += RUN_COINS
      paidRuns.push(run.id)
      delete paidTasks[run.id]
    } else if (paid.size) {
      paidTasks[run.id] = [...paid]
    }
  }
  return { wallet: { ...wallet, coins: wallet.coins + earned, paidTasks, paidRuns }, earned }
}

// The coins a check-in on day `streak` of a run pays.
export const checkInCoins = (streak: number) => Math.min(CHECK_IN_MAX, CHECK_IN_COINS + STREAK_STEP * (streak - 1))

// The day before `day` ('YYYY-MM-DD').
export function previousDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, date - 1)).toISOString().slice(0, 10)
}

// The wallet after checking in on `today`, or null when already done today. Yesterday's check-in carries the streak
// on; any gap starts it again at day 1.
export function checkIn(wallet: Wallet, today: string): { wallet: Wallet; earned: number } | null {
  if (wallet.checkedInOn === today) return null
  const streak = wallet.checkedInOn === previousDay(today) ? (wallet.streak ?? 0) + 1 : 1
  const earned = checkInCoins(streak)
  return { wallet: { ...wallet, coins: wallet.coins + earned, checkedInOn: today, streak }, earned }
}

// The streak still alive on `today`: checked in today or yesterday, else 0.
export function liveStreak(wallet: Wallet, today: string): number {
  return wallet.checkedInOn === today || wallet.checkedInOn === previousDay(today) ? (wallet.streak ?? 0) : 0
}

// The wallet after paying `cost`, or null when there are not enough coins.
export function spend(wallet: Wallet, cost: number): Wallet | null {
  if (!Number.isInteger(cost) || cost < 0 || cost > wallet.coins) return null
  return { ...wallet, coins: wallet.coins - cost }
}
