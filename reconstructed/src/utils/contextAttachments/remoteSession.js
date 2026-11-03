/**
 * utils/contextAttachments/remoteSession.ts
 *
 * 2.1.316 新增：远程会话上下文附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, M } from "../../../vendor/zod/v4/classic/schemas.js";

/**
 * 远程会话附件 schema：仓库 url、commit/PR 署名、是否提示发送用户文件、托管的 commit/PR 设置。
 */
//@ chunk-e6aww6q8.js:113636-113768 placement
var remoteSessionAttachmentSchema = DoctorLazy(() =>
  u({
    url: o().nullable(),
    commit: o(),
    pr: o(),
    sendUserFileHint: M(),
    managedCommit: M().optional(),
    managedPr: M().optional(),
  }),
);
//@ chunk-e6aww6q8.js:113768-113858 placement
function dbt(e) {
  return e.type === "attachment" && e.attachment.type === "remote_session_change";
}
/**
 * 取消息中最近一次远程会话附件。
 */
//@ chunk-e6aww6q8.js:113858-114018 placement
function lastRemoteSessionAttachment(e) {
  for (let n = e.length - 1; n >= 0; n--) {
    let r = e[n];
    if (r === void 0 || !dbt(r)) continue;
    let safeParse = remoteSessionAttachmentSchema().safeParse(r.attachment);
    if (safeParse.success) return safeParse.data;
  }
  return;
}

export { remoteSessionAttachmentSchema, dbt, lastRemoteSessionAttachment };
