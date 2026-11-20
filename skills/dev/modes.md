# Các chế độ phụ của /dev

## Chỉ tìm hiểu: `/dev research <câu hỏi hoặc ticket>`
Chỉ chạy bước 0, không code. Orchestrator tách câu hỏi, giao researcher, rồi báo user một bản gộp: trả lời, bằng chứng
(`file:dòng`, link), các lựa chọn và lựa chọn đề xuất, điều chưa chắc. User muốn làm tiếp → chạy luồng đầy đủ từ bước 1
với kết quả này.

## Code đã có sẵn: `/dev review <ticket> [nhánh]`
Bỏ bước Code, bắt đầu từ Review trên code đã viết.
- **Chỗ chạy:** không có `nhánh` → thay đổi chưa commit ở checkout hiện tại, mọi worker dùng `--worktree current`
  (worktree mới không có thay đổi chưa commit). Có `nhánh` → worktree đang mở nhánh đó (`orca worktree list`), chưa có
  thì tạo bằng `--worktree new-child --base-branch <nhánh>`.
- **Spec:** viết lại từ `git diff` (+ ticket nếu có): thay đổi gì, phần nào, tiêu chí nghiệm thu. **Hỏi user duyệt.**
- **Review → sửa:** reviewer như bước 3. Có lỗi chặn → một worker `coder` sửa trên **đúng worktree đó**; nếu là `current`,
  báo user không sửa tay cùng lúc. Sửa xong review lại.
- **Test, nghiệm thu:** như bước 4, 5. Code ở `current` thì dev server đang chạy từ checkout này có thể dùng luôn.

## Theo dõi: `/dev status`
Chạy ở phiên nào cũng được (không mở tab orchestrator). Lấy từ:
- `orca orchestration task-list` — việc của từng worker và trạng thái task.
- `orca orchestration worker-list` — terminal của worker còn sống không (`active`, `reclaimable`, `retained`, `released`).
- `orca worktree ps` — worktree, nhánh, agent đang chạy.

Báo một bảng: worker (vai + phần việc), worktree / nhánh, trạng thái, việc đang làm / vừa xong.
- **Đang làm:** task đang chạy, terminal `active`.
- **Rảnh:** task xong (`worker_done`) mà terminal còn mở (`reclaimable` / `retained`) — giao việc mới được.
- **Chờ:** đang `ask` hoặc bị chặn bởi task khác (`--deps`) — ghi rõ chờ gì.
- **Đã đóng:** `released` — không dùng được nữa.

Giao việc mới: việc **trong worktree của một worker rảnh** (sửa lỗi review, làm tiếp trên chính worktree đó) → dùng lại
worker đó (`worker-start --terminal <handle của nó>`). Phần khác cần worktree riêng → mở worker mới (không nhét vào
worktree của phần khác), khi chưa đủ 3 worker.

## Trong 1 tab: `--here` (vd. `/dev review --here [ticket] [nhánh]`, `/review --here`)
Không mở tab orchestrator, không tạo worker Orca: **tab đang chạy là orchestrator**, các vai chạy bằng **subagent của
Claude Code** (Agent tool) ngay trong tab, kết quả trả về tab. Chỉ có Claude (bỏ qua `agent` / `model` khác Claude trong
`team.json`; model Claude thì truyền qua tham số `model` của Agent tool nếu có).
- **Spec:** như thường (từ `git diff` / ticket), **hỏi user duyệt**.
- **Review:** một subagent reviewer (`subagent_type` là agent reviewer của repo nếu `notes` chỉ tới, vd. `web-reviewer`;
  không có thì `general-purpose`), prompt: "đọc `<SKILL_DIR>/roles/reviewer.md` và làm theo", kèm diff / phạm vi và
  phần `notes` liên quan. Diff lớn → chia theo module, nhiều subagent song song (tối đa 3).
- **Skeptic:** có lỗi chặn → một subagent khác, prompt "làm skeptic theo `roles/reviewer.md`" kèm danh sách lỗi chặn.
- **Xác nhận trước khi sửa (bắt buộc):** review xong thì **dừng lượt**, báo bảng lỗi đánh số (chặn `CONFIRMED` trước,
  gợi ý sau; mỗi lỗi `file:dòng`, vì sao, cách sửa) và hỏi: sửa lỗi nào (vd. "sửa 1, 3", "sửa hết lỗi chặn", "không sửa").
  **Không sửa file nào** cho tới khi user trả lời; im lặng hay trả lời không rõ = không sửa. Mỗi vòng sửa sau cũng hỏi lại.
  Trong Claude Code, mod của plugin chặn cứng Edit / Write tới khi user trả lời "sửa …" (mở đúng lượt đó; `--off` hoặc
  "xong review" thì tắt); bị từ chối thì báo bảng lỗi và hỏi, đừng thử lại hay sửa bằng Bash.
- **Sửa:** chỉ đúng các lỗi user chọn. Tab này tự sửa (theo `roles/coder.md`: tối thiểu, kèm test tái hiện); rồi một
  subagent review lại chỉ kiểm tra lỗi đã đóng chưa. Dừng khi không còn tiến bộ.
- **Test:** subagent tester (agent tester của repo nếu có, vd. `web-tester`) hoặc tab tự test theo `roles/tester.md`.
- **Nghiệm thu:** tóm tắt như bước 5. Không commit khi user chưa bảo.
- Luật chung vẫn giữ: chặn / gợi ý, chỉ `CONFIRMED` mới sửa, tài nguyên của tester một lúc một việc.
