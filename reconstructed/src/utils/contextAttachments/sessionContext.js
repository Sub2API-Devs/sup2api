/**
 * utils/contextAttachments/sessionContext.ts
 *
 * 2.1.316 新增：会话上下文附件（何时注入的原因）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { partialRecord, _enum, string, u, M } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-e6aww6q8.js:108297-108553 placement
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
  "memory_paused",
  "memory_resumed",
  "auto_memory_off",
  "auto_memory_back_on",
];
//@ chunk-e6aww6q8.js:108553-109589 placement
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
//@ chunk-e6aww6q8.js:109589-109773 placement
/**
 * 会话上下文字段名（用户邮箱、附加项目、git 状态、Perforce 模式）及字段值、原因、日期的 schema。
 */
var SESSION_CONTEXT_FIELDS = ["userEmail", "attachedProject", "gitStatus", "perforceMode"];
var sessionContextValuesSchema = DoctorLazy(() => partialRecord(_enum(SESSION_CONTEXT_FIELDS), string()));
var sessionContextReasonSchema = DoctorLazy(() => _enum(SESSION_CONTEXT_REASONS));
var sessionDateSchema = DoctorLazy(() =>
  u({
    date: string(),
    changed: M().optional(),
    assumedUtc: M().optional(),
  }),
);
//@ chunk-e6aww6q8.js:109773-110438 placement
/**
 * 会话上下文重新读取后的提示，新值替换之前公告的值。
 */
function buildSessionContextRefreshNotice(e, n, r) {
  let flattened = SESSION_CONTEXT_FIELDS.flatMap((y) =>
    e[y]
      ? [
          `# ${y}
${e[y]}`,
        ]
      : [],
  );
  if (flattened.length === 0)
    return n
      ? `The session context was re-read${r ? ` ${describeSessionContextReason(r)}` : ""}; the values announced earlier (account, project, git status) no longer apply.`
      : "";
  return `${n ? (r ? `The session context was re-read ${describeSessionContextReason(r)}; these values replace the earlier ones:` : "The session context has changed; these values replace the earlier ones:") : "As you answer the user's questions, you can use the following context:"}
${flattened.join(`
`)}

Claude Code attached this context automatically; it isn't part of the user's message. It describes the user's own account and workspace, so they don't need it reported back.`;
}
//@ chunk-e6aww6q8.js:110438-111146 placement
/**
 * 生成日期提示：UTC 日期与用户本地日期可能不同。
 */
function buildDateNotice(e) {
  if (e.assumedUtc)
    return e.changed
      ? `The UTC date is now ${e.date}. The user's local date can differ. If a system-reminder in a user's message, other than an earlier "Today's date is" line (that was the UTC date), gives a date or time that is not marked UTC, that is the user's local date: treat it as today's date.`
      : `The UTC date is ${e.date}. The user's local date can differ. If a system-reminder in a user's message gives a date or time that is not marked UTC, that is the user's local date: treat it as today's date.`;
  return e.changed
    ? `The date has changed. Today's date is now ${e.date}. No need to announce the new date \u2014 the user's own clock shows it.`
    : `Today's date is ${e.date}.`;
}
//@ chunk-e6aww6q8.js:111146-111199 placement
/**
 * 判断两组会话上下文值是否完全相同。
 */
function sameSessionContextValues(sessionContextAttachmentData, n) {
  return SESSION_CONTEXT_FIELDS.every((r) => sessionContextAttachmentData[r] === n[r]);
}
//@ chunk-e6aww6q8.js:111199-111283 placement
/**
 * 判断消息是否为会话上下文附件。
 */
function isSessionContextAttachment(e) {
  return e.type === "attachment" && e.attachment.type === "session_context";
}
//@ chunk-e6aww6q8.js:111283-111356 placement
/**
 * 判断消息是否为日期附件。
 */
function isDateAttachment(e) {
  return e.type === "attachment" && e.attachment.type === "date";
}
//@ chunk-e6aww6q8.js:111436-111514 placement
/**
 * 取最近一次日期附件里的日期。
 */
function lastSessionDate(e) {
  return sessionDateSchema().safeParse(e.findLast(isDateAttachment)?.attachment).data?.date;
}
export {
  sessionContextValuesSchema,
  isSessionContextAttachment,
  buildSessionContextRefreshNotice,
  sessionContextReasonSchema,
  sessionDateSchema,
  buildDateNotice,
  SESSION_CONTEXT_REASONS,
  describeSessionContextReason,
  SESSION_CONTEXT_FIELDS,
  sameSessionContextValues,
  lastSessionDate,
};
