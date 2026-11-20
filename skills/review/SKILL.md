---
name: review
description: Review code đã viết sẵn bằng nhóm worker Orca (reviewer + skeptic, coder sửa lỗi chặn, tester), hoặc gọn trong 1 tab bằng subagent với --here — lối tắt cho chế độ review của skill dev. Dùng khi user gọi /review hoặc bảo review thay đổi chưa commit / một nhánh bằng các agent.
---
# /review [--here | --off] [ticket] [nhánh]

Lối tắt cho `/dev review`: đọc `../dev/SKILL.md` (cùng plugin, `SKILL_DIR` của nó là thư mục `dev` bên cạnh thư mục
này) rồi chạy đúng như user gõ `/dev review <tham số>`, theo mục "Code đã có sẵn" trong `../dev/modes.md`.

- Không có tham số → review thay đổi chưa commit ở checkout hiện tại.
- Có nhánh → review nhánh đó.
- Có ticket → dùng ticket để viết tiêu chí nghiệm thu.
- Có `--here` → chạy gọn trong tab này bằng subagent, không mở tab / worker Orca (mục "Trong 1 tab" trong `../dev/modes.md`).
  Review xong luôn dừng lại hỏi user sửa lỗi nào; không sửa gì khi chưa được xác nhận. Mod của plugin **khoá cứng** các
  tool sửa file (Edit / Write / MultiEdit / NotebookEdit) tới khi user trả lời có chữ "sửa …", mở cho đúng lượt đó.
- Khoá tự tắt khi review kết thúc (câu nghiệm thu kết thúc bằng dòng `✅ Review xong`), khi user trả lời "không sửa" /
  "bỏ qua", hoặc khi user gõ lệnh `/…` khác. Có `--off` (hoặc user nói "xong review") → tắt khoá bằng tay; chỉ báo "đã tắt
  khoá review", không làm gì thêm.

Luồng, vai, cách mở tab orchestrator và luật đều theo skill `dev`; skill này không thêm luật nào.
