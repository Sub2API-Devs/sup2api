/**
 * utils/contextAttachments/sessionContext.ts
 *
 * 2.1.316 新增：会话上下文附件（何时注入的原因）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (10)
 * attribution: placement 9, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  partialRecord,
  _enum,
  stringSchema,
  objectSchema,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:111103-111392 placement
/**
 * 会话上下文附件注入原因的枚举（会话开始、压缩、策略刷新、目录添加、设置同步、账号变化、记忆暂停/恢复等）。
 */
var SESSION_CONTEXT_REASONS = [
  "session_start",
  "compaction",
  "policy_refresh",
  "managed_folder_check",
  "directory_added",
  "settings_sync",
  "account_change",
  "hooks_invalidate",
  "policy_verdict",
  "project_reread",
  "project_changed",
  "project_left",
  "memory_paused",
  "memory_resumed",
  "auto_memory_off",
  "auto_memory_back_on",
];
//@ chunk-5xgkngpb.js:111392-111457 layout
function reason(reason) {
  return reason === "project_changed" || reason === "project_left";
}
//@ chunk-5xgkngpb.js:111457-112674 placement
/**
 * 说明会话上下文为何在此刻注入（会话开始、压缩后、托管设置变化等）。
 */
function describeSessionContextReason(reason) {
  switch (reason) {
    case "session_start":
      return "when this session started";
    case "compaction":
      return "after the conversation was compacted";
    case "policy_refresh":
      return "after the organization's managed settings changed";
    case "managed_folder_check":
      return "after a check of this machine's managed folder";
    case "directory_added":
      return "after a working directory was added";
    case "settings_sync":
      return "after settings were synced onto this machine";
    case "account_change":
      return "after the account changed";
    case "hooks_invalidate":
      return "after a plugin had the context re-read";
    case "policy_verdict":
      return "after the organization's policy arrived";
    case "project_reread":
      return "after an earlier read of the attached claude.ai Project failed";
    case "project_changed":
      return "after this chat's claude.ai Project changed";
    case "project_left":
      return "after this chat was moved out of its claude.ai Project, which no longer applies";
    case "memory_paused":
      return "after memory was paused for this session";
    case "memory_resumed":
      return "after memory was resumed for this session";
    case "auto_memory_off":
      return "after auto-memory was turned off for this session";
    case "auto_memory_back_on":
      return "after auto-memory was turned back on for this session";
  }
}
//@ chunk-5xgkngpb.js:112674-112858 placement
/**
 * 会话上下文字段名（用户邮箱、附加项目、git 状态、Perforce 模式）及字段值、原因、日期的 schema。
 */
var SESSION_CONTEXT_FIELDS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var sessionContextValuesSchema;
var sessionContextReasonSchema;
var sessionDateSchema;
deferInit("chunk-5xgkngpb.js:112674", () => {
  SESSION_CONTEXT_FIELDS = ["userEmail", "attachedProject", "gitStatus", "perforceMode"];
  sessionContextValuesSchema = DoctorLazy(() => partialRecord(_enum(SESSION_CONTEXT_FIELDS), stringSchema()));
  sessionContextReasonSchema = DoctorLazy(() => _enum(SESSION_CONTEXT_REASONS));
  sessionDateSchema = DoctorLazy(() =>
    objectSchema({
      date: stringSchema(),
      changed: booleanSchema().optional(),
      assumedUtc: booleanSchema().optional(),
    }),
  );
});
//@ chunk-5xgkngpb.js:112858-113523 placement
/**
 * 会话上下文重新读取后的提示，新值替换之前公告的值。
 */
function buildSessionContextRefreshNotice(previous, next, options) {
  let flattened = SESSION_CONTEXT_FIELDS.flatMap((field) =>
    previous[field]
      ? [
          `# ${field}
${previous[field]}`,
        ]
      : [],
  );
  if (flattened.length === 0)
    return next
      ? `The session context was re-read${options ? ` ${describeSessionContextReason(options)}` : ""}; the values announced earlier (account, project, git status) no longer apply.`
      : "";
  return `${next ? (options ? `The session context was re-read ${describeSessionContextReason(options)}; these values replace the earlier ones:` : "The session context has changed; these values replace the earlier ones:") : "As you answer the user's questions, you can use the following context:"}
${flattened.join(`
`)}

Claude Code attached this context automatically; it isn't part of the user's message. It describes the user's own account and workspace, so they don't need it reported back.`;
}
//@ chunk-5xgkngpb.js:113523-114231 placement
/**
 * 生成日期提示：UTC 日期与用户本地日期可能不同。
 */
function buildDateNotice(date) {
  if (date.assumedUtc)
    return date.changed
      ? `The UTC date is now ${date.date}. The user's local date can differ. If a system-reminder in a user's message, other than an earlier "Today's date is" line (that was the UTC date), gives a date or time that is not marked UTC, that is the user's local date: treat it as today's date.`
      : `The UTC date is ${date.date}. The user's local date can differ. If a system-reminder in a user's message gives a date or time that is not marked UTC, that is the user's local date: treat it as today's date.`;
  return date.changed
    ? `The date has changed. Today's date is now ${date.date}. No need to announce the new date \u2014 the user's own clock shows it.`
    : `Today's date is ${date.date}.`;
}
//@ chunk-5xgkngpb.js:114231-114284 placement
/**
 * 判断两组会话上下文值是否完全相同。
 */
function sameSessionContextValues(sessionContextAttachmentData, other) {
  return SESSION_CONTEXT_FIELDS.every((field) => sessionContextAttachmentData[field] === other[field]);
}
//@ chunk-5xgkngpb.js:114284-114368 placement
/**
 * 判断消息是否为会话上下文附件。
 */
function isSessionContextAttachment(attachment) {
  return attachment.type === "attachment" && attachment.attachment.type === "session_context";
}
//@ chunk-5xgkngpb.js:114368-114441 placement
/**
 * 判断消息是否为日期附件。
 */
function isDateAttachment(attachment) {
  return attachment.type === "attachment" && attachment.attachment.type === "date";
}
//@ chunk-5xgkngpb.js:114521-114599 placement
/**
 * 取最近一次日期附件里的日期。
 */
function lastSessionDate(messages) {
  return sessionDateSchema().safeParse(messages.findLast(isDateAttachment)?.attachment).data?.date;
}
export {
  sessionContextValuesSchema,
  buildSessionContextRefreshNotice,
  sessionContextReasonSchema,
  sessionDateSchema,
  buildDateNotice,
  isSessionContextAttachment,
  SESSION_CONTEXT_REASONS,
  describeSessionContextReason,
  reason,
  SESSION_CONTEXT_FIELDS,
  sameSessionContextValues,
  lastSessionDate,
};
