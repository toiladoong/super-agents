// The usage guide the /office pane shows under the office, as Markdown every surface draws; one per language.
import type { Lang } from './i18n'

export const OFFICE_HELP: Record<Lang, string> = {
  vi: `**Cách đọc văn phòng**
- Gõ phím, màn hình chạy code: **đang làm**
- Giơ tay, bong bóng "!" đỏ: **cần bạn** (Claude Code đang hỏi duyệt một tool)
- Bong bóng "…" và cốc cà phê: **đang chờ** (xong lượt, chờ bạn hoặc chờ việc)
- Dấu "✓", ngả ghế: **xong** — rời bàn sau 10 phút
- Áo theo vai, chữ trên ngực: **O** tím orchestrator · **RS** xanh dương researcher · **C** xanh lá coder · **RV** cam reviewer · **S** vàng skeptic · **T** hồng tester · áo xám không chữ: chưa rõ vai
- Rê chuột lên bàn: mô tả, loại agent, tool vừa gọi

**Dùng**
- Bàn đầu là phiên Claude Code này; các bàn sau là subagent / teammate nó gọi.
- Muốn đúng màu áo: mô tả subagent bắt đầu bằng vai (**\`coder · sửa header\`**) hoặc dùng agent có tên vai (**\`web-tester\`**, **\`reviewer\`**).
- **\`/super-agents:dev <ticket>\`** chạy cả nhóm agent qua Orca: (research) → kế hoạch → **bạn duyệt** → code → review → test → nghiệm thu → **bạn duyệt**
- **\`/super-agents:dev plan <ticket>\`** chỉ lập kế hoạch rồi dừng, lưu **\`.agents/plans/<ticket>.md\`**; chạy **\`/super-agents:dev <ticket>\`** sau để làm theo
- **\`/super-agents:review [ticket] [nhánh]\`** chỉ review code đã viết; ticket làm tiêu chí nghiệm thu, không ghi nhánh = thay đổi chưa commit
- **\`/super-agents:review here [ticket]\`** review gọn trong tab này bằng subagent, không mở tab / worker mới; hỏi bạn chọn lỗi trước khi sửa
- Thêm **\`env <tên|url>\`** để tester test trên môi trường thật (tên lấy từ \`environments\` trong team.json)
- **\`/super-agents:dev status\`** xem worker nào đang làm / rảnh
- Đóng pane là dừng cập nhật; **\`/office\`** mở lại.
- Ngôn ngữ: \`"language": "vi" | "en"\` trong **\`.agents/team.json\`** (mặc định tiếng Việt).`,
  en: `**Reading the office**
- Typing, code scrolling on screen: **working**
- Hand raised, red "!" bubble: **needs you** (Claude Code is asking to approve a tool)
- "…" bubble and a coffee cup: **waiting** (turn finished, waiting for you or for work)
- "✓", leaning back: **done** — leaves the desk after 10 minutes
- Shirt by role, letter on the chest: **O** purple orchestrator · **RS** blue researcher · **C** green coder · **RV** orange reviewer · **S** yellow skeptic · **T** pink tester · grey with no letter: role unknown
- Hover a desk: description, agent type, last tool

**Use**
- The first desk is this Claude Code session; the others are the subagents / teammates it called.
- For the right shirt: start a subagent's description with its role (**\`coder · fix header\`**) or use an agent named after a role (**\`web-tester\`**, **\`reviewer\`**).
- **\`/super-agents:dev <ticket>\`** runs the whole team through Orca: (research) → plan → **you approve** → code → review → test → acceptance → **you approve**
- **\`/super-agents:dev plan <ticket>\`** only plans and stops, saving **\`.agents/plans/<ticket>.md\`**; run **\`/super-agents:dev <ticket>\`** later to follow it
- **\`/super-agents:review [ticket] [branch]\`** only reviews written code; the ticket gives the acceptance criteria, no branch = uncommitted changes
- **\`/super-agents:review here [ticket]\`** reviews right in this tab with subagents, no new tab / worker; asks you which findings to fix first
- Add **\`env <name|url>\`** so the tester tests a real environment (names from \`environments\` in team.json)
- **\`/super-agents:dev status\`** shows which workers are busy / free
- Closing the pane stops the updates; **\`/office\`** opens it again.
- Language: \`"language": "vi" | "en"\` in **\`.agents/team.json\`** (Vietnamese by default).`
}
