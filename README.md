# super-agents

Nhóm agent chạy trong Orca: **orchestrator** điều phối **researcher**, **coder**, **reviewer**, **tester**
cho một ticket. Mỗi vai chạy bằng AI / model nào là cấu hình theo repo (mặc định Claude).

## Cài
Repo: https://github.com/toiladoong/super-agents

Claude Code (mỗi máy một lần):

```
/plugin marketplace add toiladoong/super-agents
/plugin install super-agents@super-agents
```

Cập nhật bản mới: `/plugin marketplace update super-agents` rồi `/plugin update super-agents@super-agents` (hoặc
`/reload-plugins` trong phiên đang mở).

Trong Orca, các profile Claude dùng chung `~/.claude/plugins` (junction): cài **một lần từ `~/.claude`**, đừng cài từ
phiên Orca (đường dẫn ghi theo profile Orca thì app desktop Claude bỏ qua plugin):

```
CLAUDE_CONFIG_DIR="$HOME/.claude" claude plugin marketplace add toiladoong/super-agents
CLAUDE_CONFIG_DIR="$HOME/.claude" claude plugin install super-agents@super-agents
```

AI khác (Codex, opencode...) và panel Orca cần mã ở máy: `git clone https://github.com/toiladoong/super-agents.git`.
- Skill cho AI khác: thư mục skill dùng chung của Orca `~/.agents/skills/`. Windows:
  `New-Item -ItemType Junction -Path "$env:USERPROFILE\.agents\skills\dev" -Target "<thư mục clone>\skills\dev"`
  (macOS / Linux: `ln -s`). `orca skills installed` phải thấy `dev` ở "Agent skills home".
- Panel Agent Office: `orca plugin dev load <thư mục clone>/orca-office` (xem mục Agent Office bên dưới).

Cần: Orca đang chạy, `orca` CLI, skill `orchestration` của Orca (`orca skills install --skill orchestration`).

## Dùng
| Lệnh (Claude Code) | Làm gì |
|---|---|
| `/super-agents:dev <ticket> [--research]` | Mở tab orchestrator: (research, khi có `--research` hoặc ticket chưa rõ) → kế hoạch → bạn duyệt → code → review → test → nghiệm thu → bạn duyệt |
| `/super-agents:dev research <câu hỏi>` | Chỉ tìm hiểu, không code |
| `/super-agents:dev review <ticket> [nhánh]` | Code đã viết sẵn: review → sửa → test |
| `/super-agents:dev plan [here] <ticket>` | Chỉ lập kế hoạch (research nếu cần) → bạn duyệt → lưu `.agents/plans/<ticket>.md`, chưa code. Sau đó `/super-agents:dev <ticket>` làm theo file này |
| `/super-agents:review [ticket] [nhánh]` | Lối tắt của dòng trên: chỉ review (không tham số = thay đổi chưa commit) |
| `/super-agents:review here [ticket]` | Review gọn trong tab đang mở bằng subagent Claude, không mở tab / worker Orca. **Khoá sửa file** (thanh trạng thái 🔒) tới khi bạn trả lời "sửa 1, 3" / "sửa hết lỗi chặn"; mở đúng lượt đó rồi khoá lại |
| `/super-agents:review off` | Tắt khoá bằng tay (hoặc nói "xong review"). Thường không cần: khoá tự tắt khi review xong (dòng `✅ Review xong`), khi bạn trả lời "không sửa" / "bỏ qua", hoặc khi bạn gõ lệnh `/…` khác |

Trong lúc review `here`, gợi ý sau mỗi lượt (khung chat Orca và khung prompt Claude Code) là câu trả lời tiếp theo: xong lượt review là **"sửa hết lỗi chặn"**, xong lượt sửa là
**"xong review"**; bấm **Tab** (hoặc →) để lấy, sửa lại nếu cần (vd. "sửa 1, 3") rồi gửi.
| `/super-agents:dev status` | Bảng worker đang làm / rảnh / chờ |

Orchestrator dừng hỏi user ở 2 chỗ: duyệt spec, và nghiệm thu trước khi gộp / commit. Worker không commit.

## Cấu hình theo repo
Chép `skills/dev/team.default.json` vào `<repo>/.agents/team.json` rồi chỉnh:

```json
{
  "roles": {
    "orchestrator": { "agent": "claude", "model": "opus" },
    "reviewer": { "agent": "codex", "role": ".agents/roles/my-reviewer.md" }
  },
  "notes": ["Thư mục shared/ dùng chung: chỉ một coder sửa.", "Dev server :3000 chỉ tester dùng."]
}
```

- `agent`: id agent Orca. `model`: tuỳ chọn, tên model của AI đó (đổi agent thì đổi / xoá model). Orca chỉ nhận
  `--model` cho Claude, Codex, Cursor, Antigravity, Grok, Muse (và OpenCode); AI khác chạy model trong cấu hình riêng của nó.
- `role`: file vai riêng của repo; bỏ trống = vai mặc định trong `skills/dev/roles/`.
- `notes`: luật riêng của repo, orchestrator chép vào spec của worker.

Có plugin [ponytail](https://github.com/dietrichgebert/ponytail) thì reviewer chạy `/ponytail:ponytail-review` và orchestrator
chạy `/ponytail:ponytail-debt` lúc nghiệm thu.

## Agent Office (plugin Orca, tuỳ chọn): panel văn phòng + sửa team.json trực quan
Panel `orca-office/`: văn phòng pixel trong sidebar phải của Orca, mỗi agent là một nhân viên ngồi bàn. Màu áo theo vai,
chữ cái trên ngực áo (O orchestrator, R researcher, C coder, V reviewer, S skeptic, T tester);
(đọc từ tên tab: `coder · …`), tóc theo AI; gõ phím = đang làm, giơ tay + "!" = cần bạn, "…" + cốc cà phê = đang chờ,
"✓" = xong (rời bàn sau 10 phút). Rê chuột lên bàn để xem tên, vai, trạng thái, thời gian.

```
orca plugin dev load <thư mục plugin>/orca-office            # in ra fingerprint
orca plugin dev load <thư mục plugin>/orca-office --approve <fingerprint>
orca plugin open local.super-agents-office
```

**Sửa team trực quan:** bấm nút **⚙ Team** trên panel Agent Office (mở `.agents/team.json` của workspace đang mở), hoặc mở `.agents/team.json` (hoặc `team.default.json`) trong Orca, chọn **Team** ở nút chuyển
bên cạnh Source. Mỗi vai một dòng (hình nhân viên xem trước, AI, model, file vai), các luật `notes` sửa / thêm / xoá
được. AI và model chọn bằng danh sách; model có gợi ý theo AI (Claude: opus / sonnet / haiku; Codex: gpt-6.2-sol,
gpt-6.2-astra, gpt-6-astra, gpt-6.1-terra, gpt-6-luna; OpenCode: `provider/model`) và mục "nhập tên khác…".
AI không có trong danh sách gợi ý (Antigravity, Cursor) thì chọn "mặc định" hoặc nhập tên. Đổi AI thì model cũ tự xoá.
Các khoá khác trong file (như `_comment`) giữ nguyên.

Kiểm tra logic: mở `orca-office/panel/agents.check.html` và `orca-office/team-editor/editor.check.html` trong trình
duyệt, tiêu đề trang phải là `PASS`.

Quyền: panel sandbox đọc trạng thái agent (`agent:read`); worker nhỏ (`worker/main.ts`) để nút ⚙ Team mở file, cần
`workspace:read` + `workspace:write` và chạy dạng `trusted-worker` (Orca hỏi duyệt khi nạp). Hiện agent của mọi workspace, tên bàn là tên phiên (worker đọc `orca worktree ps`, cập nhật mỗi 3 giây).

## Văn phòng trong Claude Code: `/office`
Plugin còn có một mod Claude Code: gõ `/office` để mở pane **Agent Office** cạnh transcript. Desktop app, VS Code và
app mobile Claude vẽ văn phòng pixel (SVG có hoạt hình); terminal hiện danh sách chữ.

Các bàn là **agent của chính phiên Claude Code đó**: phiên chính (đang làm khi có lượt chạy, đang chờ khi xong lượt) và mọi
subagent / teammate nó gọi (`$.agent.list()`: đang chạy → gõ phím, chờ / idle → "…", xong / lỗi → "✓"). Khi Claude Code
hỏi bạn duyệt một tool, agent đó giơ tay "!". Rê chuột lên bàn để xem mô tả, loại agent, tool vừa gọi. Vai (màu áo) lấy
từ chữ đầu mô tả (`coder · …`) hoặc từ loại agent (`web-tester` → tester). Không cần Orca; agent của Orca xem ở panel
Agent Office trong Orca. Nút **Hướng dẫn** dưới văn phòng mở phần giải thích ký hiệu, màu áo / tóc và cách dùng (cả
pane `/office` lẫn panel trong Orca).

Mã ở `hooks/` (`register.tsx`, `agents.ts`, `office-svg.ts`), kiểu ở `types/`, test ở `tests/`:
`claude plugin validate .` và `claude plugin test .`.
