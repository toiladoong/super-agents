// The words the plugin shows the person, in the repo's `language` (`.agents/team.json`, Vietnamese by default).
export type Lang = 'vi' | 'en'

export const TEAM_FILE = '.agents/team.json'

// `language` of a team.json text; anything else (no file, broken JSON, another value) is Vietnamese.
export function languageOf(teamJson: string | null | undefined): Lang {
  try {
    return JSON.parse(teamJson ?? '{}')?.language === 'en' ? 'en' : 'vi'
  } catch {
    return 'vi'
  }
}

export const TEXT = {
  vi: {
    guardLocked: '🔒 review here: chưa sửa file — trả lời "sửa 1, 3" / "sửa hết lỗi chặn" để cho phép',
    guardOpen: '✏️ review here: đang sửa các lỗi đã chọn',
    suggestFix: 'sửa hết lỗi chặn',
    suggestDone: 'xong review',
    states: { working: 'đang làm', blocked: 'CẦN BẠN', waiting: 'đang chờ', done: 'xong' },
    stateWords: { working: 'đang làm', blocked: 'cần bạn', waiting: 'đang chờ', done: 'xong' },
    mainSession: 'Claude (phiên chính)',
    role: 'vai',
    noAgents: 'Chưa có agent nào đang chạy',
    moreAgents: (count: number) => `+${count} agent nữa`,
    showHelp: 'Hướng dẫn',
    hideHelp: 'Ẩn hướng dẫn',
    opened: 'Đã mở Agent Office.',
    readFailed: 'Không đọc được danh sách agent: '
  },
  en: {
    guardLocked: '🔒 review here: no file edits yet — answer "fix 1, 3" / "fix all blocking" to allow',
    guardOpen: '✏️ review here: fixing the chosen findings',
    suggestFix: 'fix all blocking',
    suggestDone: 'done review',
    states: { working: 'working', blocked: 'NEEDS YOU', waiting: 'waiting', done: 'done' },
    stateWords: { working: 'working', blocked: 'needs you', waiting: 'waiting', done: 'done' },
    mainSession: 'Claude (main session)',
    role: 'role',
    noAgents: 'No agents running yet',
    moreAgents: (count: number) => `+${count} more agents`,
    showHelp: 'Guide',
    hideHelp: 'Hide guide',
    opened: 'Agent Office opened.',
    readFailed: 'Could not read the agent list: '
  }
} as const
