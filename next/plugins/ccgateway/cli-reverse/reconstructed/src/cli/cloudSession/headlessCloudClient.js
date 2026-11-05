/**
 * cli/cloudSession/headlessCloudClient.ts
 *
 * 2.1.316 新增：无头云会话客户端的初始化日志、断开原因与拒绝子类型
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hjswk319.js (18)
 * attribution: placement 18
 */
import { randomUUID } from "crypto";
import { truncateToLength } from "../../utils/stringUtils.js";
import { sanitizeAnsiText } from "../../utils/stripAnsi.js";
import { canonicalToolName } from "../../utils/permissions/permissionRuleParser.js";
import { classifyToolNameKind, TOOL_NAME_KINDS } from "../../services/tools/toolDecisionTelemetry.js";
import { countWhere } from "../../utils/collections.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hjswk319.js:28637-28768 placement
function cloudInformationalMessage(sessionId, level, content, tag) {
  return {
    type: "system",
    subtype: "informational",
    level,
    content,
    ...(tag !== undefined && {
      tag,
    }),
    uuid: randomUUID(),
    session_id: sessionId,
  };
}
//@ chunk-hjswk319.js:28768-28793 placement
/**
 * 云会话文本单行截断长度（200）与短列表保留条数（8）。
 */
var CLOUD_TEXT_LIMITS = 512;
var CLOUD_LINE_MAX_CHARS = 200;
var CLOUD_SHORT_LIST_MAX = 8;
//@ chunk-hjswk319.js:28793-28825 placement
function clipCloudLine(text) {
  return sanitizeCloudText(text, CLOUD_LINE_MAX_CHARS);
}
//@ chunk-hjswk319.js:28825-29023 placement
var CLOUD_TEXT_MAX_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var VARIATION_SELECTOR_CLASS;
var regExp;
var regExp_2;
var MAX_KEPT_VARIATION_SELECTORS;
deferInit("chunk-hjswk319.js:28825", () => {
  CLOUD_TEXT_MAX_CHARS = 2048;
  VARIATION_SELECTOR_CLASS = "[\\u200C\\u200D\\uFE00-\\uFE0F\\u{E0100}-\\u{E01EF}]";
  regExp = new RegExp(VARIATION_SELECTOR_CLASS, "gu");
  regExp_2 = new RegExp(
    `(?:(?!${VARIATION_SELECTOR_CLASS})[\\p{Cc}\\p{Cf}\\p{Default_Ignorable_Code_Point}\\u2028\\u2029])+`,
    "gu",
  );
  MAX_KEPT_VARIATION_SELECTORS = 8;
});
//@ chunk-hjswk319.js:29023-29055 placement
function clipCloudText(text) {
  return sanitizeCloudText(text, CLOUD_TEXT_MAX_CHARS);
}
//@ chunk-hjswk319.js:29055-29154 placement
/**
 * 清理并截断来自云会话的文本（去控制/格式字符、限制不可见连接符数量）。
 */
function sanitizeCloudText(text, maxChars = CLOUD_TEXT_LIMITS) {
  let keptCount = 0;
  return truncateToLength(
    sanitizeAnsiText(text)
      .replace(regExp_2, " ")
      .replace(regExp, (selector) => (keptCount++ < MAX_KEPT_VARIATION_SELECTORS ? selector : ""))
      .trim(),
    maxChars,
  );
}
//@ chunk-hjswk319.js:29154-29204 placement
var MAX_KNOWN_TOOLS_LISTED = 400;
var VERSION_STRING_PATTERN = /^[0-9A-Za-z][0-9A-Za-z.+-]{0,63}$/;
//@ chunk-hjswk319.js:29204-29934 placement
function logCloudWorkerInit(init, builtInNames) {
  let claudeCodeVersion =
    typeof init.claude_code_version === "string" && VERSION_STRING_PATTERN.test(init.claude_code_version)
      ? init.claude_code_version
      : "unknown";
  let startupTiming = init.startup_timing;
  let warmSpareClaimed =
    typeof startupTiming === "object" && startupTiming !== null && "warm_spare_claimed" in startupTiming
      ? startupTiming.warm_spare_claimed
      : undefined;
  let warmSpareText = typeof warmSpareClaimed === "boolean" ? String(warmSpareClaimed) : "unknown";
  let header = `[headlessCloudClient] worker init: claude_code_version=${claudeCodeVersion} warm_spare=${warmSpareText}`;
  if (!Array.isArray(init.tools)) return `${header} tools=unknown`;
  let mapped = init.tools.filter((tool) => typeof tool === "string").map(canonicalToolName);
  let filtered = mapped.filter((name) => builtInNames.has(name));
  let mapped_2 = mapped.filter((name) => !builtInNames.has(name)).map(classifyToolNameKind);
  let flattened = TOOL_NAME_KINDS.flatMap((kind) => {
    let kindCount = countWhere(mapped_2, (toolKind) => toolKind === kind);
    return kindCount > 0 ? [`${kind} x${kindCount}`] : [];
  });
  let joined = [...filtered.slice(0, MAX_KNOWN_TOOLS_LISTED), ...flattened].join(",");
  let moreNote =
    filtered.length > MAX_KNOWN_TOOLS_LISTED
      ? ` (+${filtered.length - MAX_KNOWN_TOOLS_LISTED} more not shown)`
      : "";
  return `${header} tools(${mapped.length})=${joined}${moreNote}`;
}
//@ chunk-hjswk319.js:29934-29970 placement
var CLOUD_DISCONNECTED_PREFIX = "Cloud session disconnected";
//@ chunk-hjswk319.js:29970-30164 placement
function cloudDisconnectReason(reason) {
  switch (reason) {
    case "untrusted_device":
    case "session_stale_relogin":
      return reason;
    case "invalid_session_id":
    case "request_rejected":
    case "malformed_response":
    case undefined:
      return "stream_closed";
  }
}
//@ chunk-hjswk319.js:30164-30875 placement
/**
 * 把云会话断开原因（stream_closed、untrusted_device、attach_rejected 等）转成给用户的说明。
 */
function cloudDisconnectMessage(reason) {
  switch (reason) {
    case "stream_closed":
      return `${CLOUD_DISCONNECTED_PREFIX} (stream_closed): this machine is no longer attached. If the session still exists it keeps running in the cloud; open it again to re-attach.`;
    case "untrusted_device":
      return `${CLOUD_DISCONNECTED_PREFIX} (untrusted_device): the server no longer accepts this machine's device proof. Sign in again on this machine, then open the session again.`;
    case "session_stale_relogin":
      return `${CLOUD_DISCONNECTED_PREFIX} (session_stale_relogin): the sign-in on this machine has expired. Sign in again on this machine, then open the session again.`;
    case "attach_rejected":
      return `${CLOUD_DISCONNECTED_PREFIX} (attach_rejected): this cloud session can no longer be attached to (it may have been archived). Start a new cloud session instead.`;
  }
}
//@ chunk-hjswk319.js:30875-31213 placement
/**
 * --max-turns 无法确认时的失败条目 {kind:'lost', name:'--max-turns', why:…}。
 */
var CLOUD_REFUSAL_SUBTYPES = {
  bypass: "rejected_argv",
  attach_restriction: "rejected_tool_restriction",
  tool_restriction: "rejected_tool_restriction",
  deny_rule_unclosed: "deny_rule_unclosed",
  sdk_mcp: "rejected_argv",
  unsupported: "rejected_unsupported",
};
var MAX_TURNS_UNCONFIRMED_ENTRY = {
  kind: "lost",
  name: "--max-turns",
  why: "the service did not confirm the turn limit, so assume none is enforced",
};
//@ chunk-hjswk319.js:31213-31430 placement
function cloudLaunchOptionsFrom(cli, flagSettings) {
  return {
    mcpConfigFlagServers: cli.mcpConfigFlagServers,
    flagSettings,
    systemPrompt: cli.systemPromptCli,
    appendSystemPrompt: cli.appendSystemPromptCli,
    selectedAgentDefinition: cli.mainThreadAgentDefinition ?? null,
  };
}
//@ chunk-hjswk319.js:31430-31478 placement
function withMaxTurns(options, maxTurns) {
  return {
    ...options,
    maxTurns,
    ...false,
  };
}
//@ chunk-hjswk319.js:31478-31554 placement
var FLAG_TREAT_CLIENT = {
  treat: "client",
};
var FLAG_TREAT_CREATE = {
  treat: "create",
};
var FLAG_TREAT_IGNORE_LOST = {
  treat: "ignore",
  kind: "lost",
};
//@ chunk-hjswk319.js:31554-31610 placement
function lostFlag(why) {
  return {
    treat: "ignore",
    kind: "lost",
    why,
  };
}
//@ chunk-hjswk319.js:31610-31701 placement
var FLAG_TREAT_PREFERENCE = {
  treat: "ignore",
  kind: "preference",
};
var FLAG_TREAT_IGNORE_KEPT = {
  treat: "ignore",
  kind: "kept",
};
var FLAG_TREAT_MOOT = {
  treat: "moot",
};
//@ chunk-hjswk319.js:31701-31758 placement
function refusedFlag(group, naming) {
  return {
    treat: "refuse",
    group,
    naming,
  };
}
export {
  sanitizeCloudText,
  clipCloudText,
  refusedFlag,
  FLAG_TREAT_CLIENT,
  FLAG_TREAT_MOOT,
  lostFlag,
  FLAG_TREAT_CREATE,
  FLAG_TREAT_IGNORE_LOST,
  FLAG_TREAT_PREFERENCE,
  FLAG_TREAT_IGNORE_KEPT,
  CLOUD_LINE_MAX_CHARS,
  cloudInformationalMessage,
  clipCloudLine,
  CLOUD_SHORT_LIST_MAX,
  cloudDisconnectReason,
  cloudDisconnectMessage,
  logCloudWorkerInit,
  MAX_TURNS_UNCONFIRMED_ENTRY,
  withMaxTurns,
  cloudLaunchOptionsFrom,
  CLOUD_REFUSAL_SUBTYPES,
};
