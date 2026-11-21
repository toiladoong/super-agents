// Words of the Orca panel and the Team editor, in the plugin's "language" setting (Orca Settings, Vietnamese by default).
// Exposes window.officeI18n = { load(), t, guide }.
;(function () {
  const TEXT = {
    vi: {
      states: { working: 'đang làm', blocked: 'cần bạn', waiting: 'đang chờ', done: 'xong' },
      elapsed: (minutes) => (minutes < 60 ? `${minutes}p` : `${Math.floor(minutes / 60)}g${minutes % 60}p`),
      unnamed: '(không tên)',
      role: 'vai',
      noAgents: 'Chưa có agent nào đang chạy. Agent mới sẽ ngồi vào bàn khi đổi trạng thái.',
      readFailed: 'Không đọc được agent: ',
      teamOpenFailed: 'Không mở được team.json: ',
      teamButtonTitle: 'Mở .agents/team.json của workspace đang mở',
      guideTitle: 'Hướng dẫn',
      rolesTitle: 'Vai trò',
      rolesHint: 'Mỗi vai chạy bằng AI nào, model nào. Bỏ trống model = model mặc định của AI; bỏ trống file vai = vai mặc định của plugin.',
      notesTitle: 'Luật riêng của repo (notes)',
      notesHint: 'Orchestrator đọc và chép phần liên quan vào việc giao cho từng worker.',
      languageTitle: 'Ngôn ngữ trả lời',
      languageHint: 'AI trả lời, viết kế hoạch và báo cáo bằng ngôn ngữ này.',
      addNote: '+ Thêm luật',
      removeNote: 'Xoá luật này',
      modelPlaceholder: 'tên model',
      modelDefault: 'mặc định',
      modelCustom: 'nhập tên khác…',
      rolePlaceholder: 'vai mặc định của plugin',
      badJson: (error) => `File không phải JSON hợp lệ (${error}). Sửa ở chế độ Source trước.`
    },
    en: {
      states: { working: 'working', blocked: 'needs you', waiting: 'waiting', done: 'done' },
      elapsed: (minutes) => (minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h${minutes % 60}m`),
      unnamed: '(unnamed)',
      role: 'role',
      noAgents: 'No agents running yet. A new agent takes a desk when its state changes.',
      readFailed: 'Could not read the agents: ',
      teamOpenFailed: 'Could not open team.json: ',
      teamButtonTitle: 'Open .agents/team.json of the focused workspace',
      guideTitle: 'Guide',
      rolesTitle: 'Roles',
      rolesHint: 'Which AI and model each role runs on. No model = the AI\'s default; no role file = the plugin\'s default role.',
      notesTitle: 'Repo rules (notes)',
      notesHint: 'The orchestrator reads them and copies the relevant ones into each worker\'s task.',
      languageTitle: 'Reply language',
      languageHint: 'The AI replies, writes plans and reports in this language.',
      addNote: '+ Add rule',
      removeNote: 'Remove this rule',
      modelPlaceholder: 'model name',
      modelDefault: 'default',
      modelCustom: 'type another name…',
      rolePlaceholder: 'plugin default role',
      badJson: (error) => `The file is not valid JSON (${error}). Fix it in Source view first.`
    }
  }

  const GUIDE = {
    vi: `
      <ul>
        <li>Gõ phím, màn hình chạy code: <b>đang làm</b></li>
        <li>Giơ tay, bong bóng "!" đỏ: <b>cần bạn</b> (agent đang hỏi duyệt hoặc chờ trả lời)</li>
        <li>Bong bóng "…" và cốc cà phê: <b>đang chờ</b></li>
        <li>Dấu "✓", ngả ghế: <b>xong</b>, rời bàn sau 10 phút</li>
        <li>Áo theo vai, chữ trên ngực: <b>O</b> tím orchestrator · <b>RS</b> xanh dương researcher · <b>C</b> xanh lá coder · <b>RV</b> cam reviewer · <b>S</b> vàng skeptic · <b>T</b> hồng tester · áo xám không chữ: chưa rõ vai</li>
        <li>Màu tóc theo AI: cam Claude · đen Codex · xanh Antigravity · tím Cursor · nâu OpenCode</li>
        <li>Rê chuột lên bàn: tên, AI, vai, trạng thái, thời gian</li>
      </ul>
      <ul>
        <li>Hiện agent của mọi workspace trong Orca, tên bàn là tên phiên (như ở sidebar Orca); cập nhật mỗi 3 giây.</li>
        <li>Vai đọc từ tên tab <code>&lt;vai&gt; · &lt;phần việc&gt;</code> (lệnh <code>/super-agents:dev</code> tự đặt cho worker); orchestrator là tab có worker báo về.</li>
        <li><b>⚙ Team</b>: mở <code>.agents/team.json</code> để chọn AI / model cho từng vai, ngôn ngữ trả lời và luật riêng của repo.</li>
        <li><code>/super-agents:dev &lt;ticket&gt;</code> chạy cả nhóm: (research) → kế hoạch → <b>bạn duyệt</b> → code → review → test → nghiệm thu → <b>bạn duyệt</b></li>
        <li><code>/super-agents:dev plan &lt;ticket&gt;</code> chỉ lập kế hoạch rồi dừng, lưu <code>.agents/plans/&lt;ticket&gt;.md</code>; chạy <code>/super-agents:dev &lt;ticket&gt;</code> sau để làm theo (thêm <code>here</code> để lập ngay trong tab)</li>
        <li><code>/super-agents:review [ticket] [nhánh]</code> chỉ review code đã viết; ticket làm tiêu chí nghiệm thu, không ghi nhánh = thay đổi chưa commit</li>
        <li><code>/super-agents:review here [ticket]</code> review gọn trong tab đang mở, không mở tab / worker mới; hỏi bạn chọn lỗi trước khi sửa</li>
        <li>Thêm <code>env &lt;tên|url&gt;</code> để tester test trên môi trường thật (tên lấy từ <code>environments</code> trong <code>team.json</code>)</li>
        <li><code>/super-agents:dev status</code> xem worker nào đang làm / rảnh</li>
        <li>Ngôn ngữ của panel theo <code>"language"</code> trong <code>team.json</code> của workspace đang mở (chọn trong <b>⚙ Team</b>); workspace chưa đặt thì theo Orca Settings → plugin Agent Office → <b>Ngôn ngữ</b>.</li>
      </ul>`,
    en: `
      <ul>
        <li>Typing, code scrolling on screen: <b>working</b></li>
        <li>Hand raised, red "!" bubble: <b>needs you</b> (the agent is asking for approval or an answer)</li>
        <li>"…" bubble and a coffee cup: <b>waiting</b></li>
        <li>"✓", leaning back: <b>done</b>, leaves the desk after 10 minutes</li>
        <li>Shirt by role, letter on the chest: <b>O</b> purple orchestrator · <b>RS</b> blue researcher · <b>C</b> green coder · <b>RV</b> orange reviewer · <b>S</b> yellow skeptic · <b>T</b> pink tester · grey with no letter: role unknown</li>
        <li>Hair by AI: orange Claude · black Codex · blue Antigravity · purple Cursor · brown OpenCode</li>
        <li>Hover a desk: name, AI, role, state, time</li>
      </ul>
      <ul>
        <li>Shows the agents of every Orca workspace; a desk is named after its session (as in Orca's sidebar); updated every 3 seconds.</li>
        <li>The role is read from the tab name <code>&lt;role&gt; · &lt;part&gt;</code> (set by <code>/super-agents:dev</code> for workers); the orchestrator is the tab its workers report to.</li>
        <li><b>⚙ Team</b>: opens <code>.agents/team.json</code> to pick the AI / model of each role, the reply language and the repo's rules.</li>
        <li><code>/super-agents:dev &lt;ticket&gt;</code> runs the whole team: (research) → plan → <b>you approve</b> → code → review → test → acceptance → <b>you approve</b></li>
        <li><code>/super-agents:dev plan &lt;ticket&gt;</code> only plans and stops, saving <code>.agents/plans/&lt;ticket&gt;.md</code>; run <code>/super-agents:dev &lt;ticket&gt;</code> later to follow it (add <code>here</code> to plan right in the tab)</li>
        <li><code>/super-agents:review [ticket] [branch]</code> only reviews written code; the ticket gives the acceptance criteria, no branch = uncommitted changes</li>
        <li><code>/super-agents:review here [ticket]</code> reviews right in the open tab, no new tab / worker; asks you which findings to fix first</li>
        <li>Add <code>env &lt;name|url&gt;</code> so the tester tests a real environment (names from <code>environments</code> in <code>team.json</code>)</li>
        <li><code>/super-agents:dev status</code> shows which workers are busy / free</li>
        <li>The panel follows <code>"language"</code> in the focused workspace's <code>team.json</code> (pick it in <b>⚙ Team</b>); a workspace without one follows Orca Settings → Agent Office plugin → <b>Language</b>.</li>
      </ul>`
  }

  const api = { lang: 'vi', t: TEXT.vi, guide: GUIDE.vi, text: TEXT, guides: GUIDE }

  // The language comes from the worker: the focused workspace's team.json `language`, else the plugin setting. Checked
  // again every few seconds (another workspace focused, team.json saved); onChange runs only when it changes.
  api.load = async function load(onChange) {
    const apply = async () => {
      // No worker / plugin API (a self-check page, an older Orca) → keep the current language.
      let answer = null
      try {
        answer = await orca.plugin.request('language.get')
      } catch {}
      const lang = (answer ? answer.language : api.lang) === 'en' ? 'en' : 'vi'
      if (lang === api.lang) return false
      api.lang = lang
      api.t = TEXT[lang]
      api.guide = GUIDE[lang]
      return true
    }
    const handleCheck = async () => {
      if ((await apply()) && onChange) onChange()
    }
    await apply()
    setInterval(handleCheck, 3000)
    try {
      orca.settings.onDidChange(handleCheck)
    } catch {}
    return api
  }

  window.officeI18n = api
})()
