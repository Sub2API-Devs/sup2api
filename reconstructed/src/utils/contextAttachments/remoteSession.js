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
import { u, string, M } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-e6aww6q8.js:113636-113768 placement
/**
 * 远程会话附件 schema：仓库 url、commit/PR 署名、是否提示发送用户文件、托管的 commit/PR 设置。
 */
var remoteSessionAttachmentSchema = DoctorLazy(() =>
  u({
    url: string().nullable(),
    commit: string(),
    pr: string(),
    sendUserFileHint: M(),
    managedCommit: M().optional(),
    managedPr: M().optional(),
  }),
);
//@ chunk-e6aww6q8.js:113768-113858 placement
/**
 * 判断消息是否为远程会话变更附件。
 */
function isRemoteSessionChangeAttachment(e) {
  return e.type === "attachment" && e.attachment.type === "remote_session_change";
}
//@ chunk-e6aww6q8.js:113858-114018 placement
/**
 * 取消息中最近一次远程会话附件。
 */
function lastRemoteSessionAttachment(e) {
  for (let idx = e.length - 1; idx >= 0; idx--) {
    let r = e[idx];
    if (r === undefined || !isRemoteSessionChangeAttachment(r)) continue;
    let s = remoteSessionAttachmentSchema().safeParse(r.attachment);
    if (s.success) return s.data;
  }
  return;
}
export { remoteSessionAttachmentSchema, isRemoteSessionChangeAttachment, lastRemoteSessionAttachment };
