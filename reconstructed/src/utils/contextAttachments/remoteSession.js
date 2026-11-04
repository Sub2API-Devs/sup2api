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
import { objectSchema, stringSchema, booleanSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:113636-113768 placement
/**
 * 远程会话附件 schema：仓库 url、commit/PR 署名、是否提示发送用户文件、托管的 commit/PR 设置。
 */
var remoteSessionAttachmentSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:113636", () => {
  remoteSessionAttachmentSchema = DoctorLazy(() =>
    objectSchema({
      url: stringSchema().nullable(),
      commit: stringSchema(),
      pr: stringSchema(),
      sendUserFileHint: booleanSchema(),
      managedCommit: booleanSchema().optional(),
      managedPr: booleanSchema().optional(),
    }),
  );
});
//@ chunk-e6aww6q8.js:113768-113858 placement
/**
 * 判断消息是否为远程会话变更附件。
 */
function isRemoteSessionChangeAttachment(attachment) {
  return attachment.type === "attachment" && attachment.attachment.type === "remote_session_change";
}
//@ chunk-e6aww6q8.js:113858-114018 placement
/**
 * 取消息中最近一次远程会话附件。
 */
function lastRemoteSessionAttachment(messages) {
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let message = messages[idx];
    if (message === undefined || !isRemoteSessionChangeAttachment(message)) continue;
    let parseResult = remoteSessionAttachmentSchema().safeParse(message.attachment);
    if (parseResult.success) return parseResult.data;
  }
  return;
}
export { remoteSessionAttachmentSchema, isRemoteSessionChangeAttachment, lastRemoteSessionAttachment };
