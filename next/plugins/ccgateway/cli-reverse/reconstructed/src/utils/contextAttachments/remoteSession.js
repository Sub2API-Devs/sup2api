/**
 * utils/contextAttachments/remoteSession.ts
 *
 * 2.1.316 新增：远程会话上下文附件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, booleanSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { isNullRenderingAttachment_2 } from "../messages.js";
import { FILE_ATTACHMENT_TYPES } from "../transcript/deserialize.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:116857-116989 placement
/**
 * 远程会话附件 schema：仓库 url、commit/PR 署名、是否提示发送用户文件、托管的 commit/PR 设置。
 */
var remoteSessionAttachmentSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:116857", () => {
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
//@ chunk-5xgkngpb.js:116989-117197 placement
/**
 * 取消息中最近一次远程会话附件。
 */
function lastRemoteSessionAttachment(messages) {
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let message = messages[idx];
    if (message?.type !== "attachment" || message.attachment.type !== "remote_session_change") continue;
    let parseResult = remoteSessionAttachmentSchema().safeParse(message.attachment);
    if (parseResult.success) return parseResult.data;
  }
  return;
}
//@ chunk-5xgkngpb.js:1910331-1910418 placement (2.1.88 match: isNullRenderingAttachment, 1)
/**
 * 判断消息是否为远程会话变更附件。
 */
function isRemoteSessionChangeAttachment(attachment) {
  return (
    attachment.type === "attachment" &&
    (isNullRenderingAttachment_2(attachment) || FILE_ATTACHMENT_TYPES.includes(attachment.attachment.type))
  );
}
export { remoteSessionAttachmentSchema, isRemoteSessionChangeAttachment, lastRemoteSessionAttachment };
