---
name: dev
description: Chạy một ticket / tính năng bằng nhóm worker Orca — orchestrator điều phối research → coder → review → test; /dev review cho code đã viết sẵn; /dev research chỉ tìm hiểu; /dev status xem worker nào đang làm / rảnh. Vai trò và AI lấy từ .agents/team.json của repo (mặc định Claude). Dùng khi user gọi /dev, hoặc bảo chia việc cho nhiều agent / worker Orca.
---
# /dev <ticket hoặc mô tả> [--research]  ·  /dev research <câu hỏi>  ·  /dev review [--here] <ticket> [nhánh]  ·  /dev status

`SKILL_DIR` = đường dẫn tuyệt đối của thư mục chứa file này. Vai mặc định ở `SKILL_DIR/roles/`, các chế độ phụ ở
`SKILL_DIR/modes.md`.

## Ai chạy skill này
- **Prompt bắt đầu bằng "Bạn là orchestrator"** → bạn là orchestrator: đọc `SKILL_DIR/roles/orchestrator.md`, rồi làm theo luồng dưới đây.
- **`/dev status`** → không mở tab orchestrator, làm theo mục "Theo dõi" trong `modes.md`.
- **`review` có cờ `--here`** → không mở tab orchestrator: bạn là orchestrator ngay tại tab này, làm theo mục "Trong 1 tab" trong
  `modes.md` (subagent thay cho worker Orca).
- **Còn lại** (user gõ `/dev` trong phiên thường) → mở tab orchestrator rồi dừng, không tự làm luồng:

  ```
  orca agent launch --agent <orchestrator.agent> [--model <orchestrator.model>] --worktree current --focus \
    --prompt "Bạn là orchestrator. Đọc <SKILL_DIR>/SKILL.md và chạy với: <đúng tham số user gõ>"
  ```

  Báo user: trao đổi, duyệt spec và nghiệm thu ở tab orchestrator. User bảo "làm orchestrator ở đây luôn" → bỏ qua, bạn là orchestrator.

Orchestrator dùng cơ chế Orca (worker-start, send, khi được đánh thức...) theo skill `orchestration`
(`orca skills get orchestration`) — đọc nó trước. Skill này chỉ quy định luồng và luật.

## Cấu hình
Đọc `.agents/team.json` ở gốc repo; không có thì dùng `SKILL_DIR/team.default.json`.
- `roles.<vai>`: `agent` (id Orca: claude, codex, antigravity, cursor, opencode...), `model` (tuỳ chọn), `role` (file prompt vai,
  đường dẫn tính từ gốc repo). Vai: `orchestrator`, `researcher`, `coder`, `reviewer`, `tester`.
  Vai thiếu trong file → `agent: claude`, không `--model`. Vai thiếu `role` → `SKILL_DIR/roles/<vai>.md`.
- `notes`: luật riêng của repo (thư mục dùng chung, tài nguyên chỉ tester dùng, skill cần đọc...). Orchestrator đọc và áp dụng
  khi chia việc, chép phần liên quan vào spec của worker.

Lệnh cho mỗi worker (chỉ thêm `--model` khi có `model`), rồi đặt tên tab theo vai để panel Agent Office và `/dev status`
nhận ra (`<handle>` lấy từ kết quả `worker-start`; orchestrator đặt tên tab của chính mình là `orchestrator · <ticket>`):

```
orca orchestration worker-start --agent <agent> [--model <model>] --worktree <...> --spec "<spec>"
orca terminal rename --terminal <handle> --title "<vai> · <phần việc>"
```

## Luồng
0. **Research** (tuỳ chọn): user thêm `--research`, hoặc ticket có điểm chưa rõ. Tách thành câu hỏi độc lập, mỗi câu
   một worker `researcher` trên `--worktree current` (chỉ đọc), song song. Gộp trả lời vào spec; đưa "Lựa chọn" cho
   user chọn nếu có.
1. **Spec** (orchestrator tự làm): đọc ticket (Jira / Figma nếu có công cụ), viết kế hoạch: phần việc, file dự kiến đổi,
   tiêu chí nghiệm thu, và **kế hoạch chạy** (mục "Phụ thuộc" dưới đây) kèm rủi ro xung đột khi gộp.
   Worktree mới tạo từ HEAD: checkout hiện tại có thay đổi chưa commit liên quan → báo user commit trước, hoặc dùng
   `/dev review`. **Hỏi user duyệt** rồi mới sang bước 2 (duyệt luôn việc commit local ở bước 2 nếu kế hoạch có nối tiếp).
2. **Code**: theo kế hoạch chạy. Mỗi phần một worker `coder`, một worktree: `--worktree new-child --name <ticket>-<phần>`.
   - Phần phụ thuộc chỉ bắt đầu khi phần nó cần đã **qua review và test (PASS)** — "coder báo xong" chưa đủ. Khi đó
     orchestrator **commit local** trên nhánh của phần đó (không push, không gộp; user đã duyệt cùng kế hoạch chạy ở
     bước 1), rồi tạo worktree cho phần phụ thuộc từ nhánh này (`--base-branch <nhánh>`).
   - Coder tự chạy build / lint / unit test; không dùng tài nguyên chỉ dành cho tester (dev server, thiết bị).
3. **Review**: worker `reviewer` trên **worktree của coder**. Reviewer là Claude có plugin ponytail → spec ghi thêm
   "chạy `/ponytail:ponytail-review` trên diff trước". Rồi theo mục "Review đối kháng" dưới đây.
4. **Test**: **một** worker `tester`, test **lần lượt** từng worktree. Spec ghi worktree + nhánh và tiêu chí nghiệm thu.
5. **Nghiệm thu**: tóm tắt cho user (thay đổi, review, bảng test). Có ponytail: `/ponytail:ponytail-debt` từng worktree,
   đưa các `shortcut:` vào tóm tắt. **Hỏi user duyệt** trước khi gộp. Gộp **từng nhánh một**, phần được phụ thuộc trước;
   xung đột → dừng, báo user, không tự giải.

## Phụ thuộc (bước 1)
Xét từng cặp phần việc. **Phải chạy nối tiếp** (hoặc gộp vào một coder) khi có một trong các dấu hiệu:
- cùng sửa một file, hoặc file sinh ra (generated) giống nhau;
- phần B dùng module / API / component phần A tạo hoặc đổi;
- ticket ghi "phụ thuộc" / "sau" phần kia;
- migration / schema phải theo thứ tự; dùng chung config, fixture, global state;
- code dùng chung theo `notes` của repo; hai coder độc lập dễ chọn thiết kế khác nhau cho cùng một thứ.

**Mặc định nối tiếp**, chỉ song song khi chắc chắn độc lập. Việc nhỏ (dưới ~15 phút) làm nối tiếp. Không chia nhỏ việc
chỉ để có nhiều worker. Kế hoạch chạy ghi dạng: `Song song 1: [A, B] → sau A: [C]`, kèm lý do mỗi chỗ nối tiếp.

## Review đối kháng (bước 3)
- Reviewer chỉ báo 2 mức: **chặn** (lỗi đã chứng minh: sai logic, bảo mật, mất dữ liệu, vỡ API / hợp đồng) và
  **gợi ý** (style, khẩu vị, "nên đầy đủ hơn", code thừa không gây lỗi). Gợi ý **không mở vòng sửa**, chỉ đưa vào tóm tắt.
- Có lỗi chặn → giao **một worker skeptic** (vai `reviewer`): cố **bác bỏ** từng lỗi chặn —
  xem chỗ gọi, code có chạy tới không, framework / chỗ khác đã xử lý chưa, chỉ là code test không. Trả mỗi lỗi một nhãn:
  `CONFIRMED` (lỗi thật), `DOWNGRADED` (thành gợi ý), `DISPUTED` (bỏ), kèm bằng chứng.
- Chỉ lỗi `CONFIRMED` gửi coder sửa (`send`). Coder sửa tối thiểu, kèm test fail với lỗi cũ và pass sau khi sửa.
- Review lại chỉ **kiểm tra lỗi đã đóng chưa** (closed / not_closed / reopened) và phần vừa sửa, không đi tìm lỗi mới.
- Dừng vòng sửa khi **không còn tiến bộ**: lỗi không thu hẹp, chỉ đổi tên lỗi, đổi agent, thêm test xanh không liên
  quan → dừng, báo user kèm bằng chứng. Không đặt số vòng cố định.

## Spec gửi worker phải có
- Đọc file vai của nó (đường dẫn tuyệt đối) và phần `notes` liên quan.
- Phạm vi được sửa (thư mục), phần không được đụng.
- Tiêu chí xong; kết thúc bằng tóm tắt + danh sách file đã đổi.

## Luật
- Worker **không commit, không push**. Orchestrator gộp / commit khi user bảo; ngoại lệ duy nhất: commit local nhánh của
  phần đã PASS để phần phụ thuộc làm tiếp (bước 2).
- Song song tối đa 3 worker. Việc **trong worktree của một worker rảnh** (sửa lỗi review, việc làm tiếp trên chính worktree đó) giao
  lại cho nó; phần khác mở worker mới (`modes.md` → Theo dõi).
- Worker hỏi (`ask`) điều không suy ra được từ spec → hỏi user, không tự quyết.
