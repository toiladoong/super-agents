// The usage guide the /office pane shows under the office, as Markdown every surface draws.
export const OFFICE_HELP = `**Cách đọc văn phòng**
- Gõ phím, màn hình chạy code: **đang làm**
- Giơ tay, bong bóng "!" đỏ: **cần bạn** (Claude Code đang hỏi duyệt một tool)
- Bong bóng "…" và cốc cà phê: **đang chờ** (xong lượt, chờ bạn hoặc chờ việc)
- Dấu "✓", ngả ghế: **xong** — rời bàn sau 10 phút
- Áo theo vai, chữ trên ngực: **O** tím orchestrator · **R** xanh dương researcher · **C** xanh lá coder · **V** cam reviewer · **S** vàng skeptic · **T** hồng tester · áo xám không chữ: chưa rõ vai
- Rê chuột lên bàn: mô tả, loại agent, tool vừa gọi

**Dùng**
- Bàn đầu là phiên Claude Code này; các bàn sau là subagent / teammate nó gọi.
- Muốn đúng màu áo: mô tả subagent bắt đầu bằng vai (**\`coder · sửa header\`**) hoặc dùng agent có tên vai (**\`web-tester\`**, **\`reviewer\`**).
- **\`/super-agents:dev <ticket>\`** chạy cả nhóm agent qua Orca: (research) → kế hoạch → **bạn duyệt** → code → review → test → nghiệm thu → **bạn duyệt**
- **\`/super-agents:dev plan <ticket>\`** chỉ lập kế hoạch rồi dừng, lưu **\`.agents/plans/<ticket>.md\`**; chạy **\`/super-agents:dev <ticket>\`** sau để làm theo
- **\`/super-agents:review [ticket] [nhánh]\`** chỉ review code đã viết; ticket làm tiêu chí nghiệm thu, không ghi nhánh = thay đổi chưa commit
- **\`/super-agents:review --here [ticket]\`** review gọn trong tab này bằng subagent, không mở tab / worker mới; hỏi bạn chọn lỗi trước khi sửa
- **\`/super-agents:dev status\`** xem worker nào đang làm / rảnh
- Đóng pane là dừng cập nhật; **\`/office\`** mở lại.`
