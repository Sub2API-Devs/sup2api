/**
 * cli/cloudSession/headlessCloudClient.ts
 *
 * 2.1.316 新增：无头云会话客户端的初始化日志、断开原因与拒绝子类型
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3wek6r2k.js (18)
 * attribution: placement 18
 */
import { randomUUID } from "crypto";
import { truncateToLength } from "../../utils/stringUtils.js";
import { Pje } from "../../utils/stripAnsi.js";
import { canonicalToolName } from "../../utils/permissions/permissionRuleParser.js";
import { classifyToolNameKind, u3s } from "../../services/tools/toolDecisionTelemetry.js";
import { count } from "../../utils/collections.js";

//@ chunk-3wek6r2k.js:29300-29431 placement
function cloudInformationalMessage(e, o, n, r) {
  return {
    type: "system",
    subtype: "informational",
    level: o,
    content: n,
    ...(r !== void 0 && { tag: r }),
    uuid: randomUUID(),
    session_id: e,
  };
}
//@ chunk-3wek6r2k.js:29431-29456 placement
var CLOUD_TEXT_LIMITS = 512,
  lPr = 200,
  dPr = 8;
//@ chunk-3wek6r2k.js:29456-29488 placement
function clipCloudLine(e) {
  return sanitizeCloudText(e, lPr);
}
//@ chunk-3wek6r2k.js:29488-29686 placement
var CLOUD_TEXT_MAX_CHARS = 2048,
  VARIATION_SELECTOR_CLASS = "[\\u200C\\u200D\\uFE00-\\uFE0F\\u{E0100}-\\u{E01EF}]",
  regExp = new RegExp(VARIATION_SELECTOR_CLASS, "gu"),
  regExp_2 = new RegExp(
    `(?:(?!${VARIATION_SELECTOR_CLASS})[\\p{Cc}\\p{Cf}\\p{Default_Ignorable_Code_Point}\\u2028\\u2029])+`,
    "gu",
  ),
  MAX_KEPT_VARIATION_SELECTORS = 8;
//@ chunk-3wek6r2k.js:29686-29718 placement
function clipCloudText(e) {
  return sanitizeCloudText(e, CLOUD_TEXT_MAX_CHARS);
}
/**
 * 清理并截断来自云会话的文本（去控制/格式字符、限制不可见连接符数量）。
 */
//@ chunk-3wek6r2k.js:29718-29818 placement
function sanitizeCloudText(e, o = CLOUD_TEXT_LIMITS) {
  let n = 0;
  return truncateToLength(
    Pje(e)
      .replace(regExp_2, " ")
      .replace(regExp, (r) => (n++ < MAX_KEPT_VARIATION_SELECTORS ? r : ""))
      .trim(),
    o,
  );
}
//@ chunk-3wek6r2k.js:29818-29868 placement
var Rr = 400,
  Dc = /^[0-9A-Za-z][0-9A-Za-z.+-]{0,63}$/;
//@ chunk-3wek6r2k.js:29868-30601 placement
function logCloudWorkerInit(e, o) {
  let n =
      typeof e.claude_code_version === "string" && Dc.test(e.claude_code_version)
        ? e.claude_code_version
        : "unknown",
    startup_timing = e.startup_timing,
    u =
      typeof startup_timing === "object" && startup_timing !== null && "warm_spare_claimed" in startup_timing
        ? startup_timing.warm_spare_claimed
        : void 0,
    p = typeof u === "boolean" ? String(u) : "unknown",
    h = `[headlessCloudClient] worker init: claude_code_version=${n} warm_spare=${p}`;
  if (!Array.isArray(e.tools)) return `${h} tools=unknown`;
  let mapped = e.tools.filter((tool) => typeof tool === "string").map(canonicalToolName),
    filtered = mapped.filter((A) => o.has(A)),
    mapped_2 = mapped.filter((A) => !o.has(A)).map(classifyToolNameKind),
    flattened = u3s.flatMap((A) => {
      let se = count(mapped_2, (q) => q === A);
      return se > 0 ? [`${A} x${se}`] : [];
    }),
    joined = [...filtered.slice(0, Rr), ...flattened].join(","),
    P = filtered.length > Rr ? ` (+${filtered.length - Rr} more not shown)` : "";
  return `${h} tools(${mapped.length})=${joined}${P}`;
}
//@ chunk-3wek6r2k.js:30601-30637 placement
var ln = "Cloud session disconnected";
//@ chunk-3wek6r2k.js:30637-30831 placement
function cloudDisconnectReason(e) {
  switch (e) {
    case "untrusted_device":
    case "session_stale_relogin":
      return e;
    case "invalid_session_id":
    case "request_rejected":
    case "malformed_response":
    case void 0:
      return "stream_closed";
  }
}
/**
 * 把云会话断开原因（stream_closed、untrusted_device、attach_rejected 等）转成给用户的说明。
 */
//@ chunk-3wek6r2k.js:30831-31542 placement
function cloudDisconnectMessage(e) {
  switch (e) {
    case "stream_closed":
      return `${ln} (stream_closed): this machine is no longer attached. If the session still exists it keeps running in the cloud; open it again to re-attach.`;
    case "untrusted_device":
      return `${ln} (untrusted_device): the server no longer accepts this machine's device proof. Sign in again on this machine, then open the session again.`;
    case "session_stale_relogin":
      return `${ln} (session_stale_relogin): the sign-in on this machine has expired. Sign in again on this machine, then open the session again.`;
    case "attach_rejected":
      return `${ln} (attach_rejected): this cloud session can no longer be attached to (it may have been archived). Start a new cloud session instead.`;
  }
}
//@ chunk-3wek6r2k.js:31542-31880 placement
var CLOUD_REFUSAL_SUBTYPES = {
    bypass: "rejected_argv",
    attach_restriction: "rejected_tool_restriction",
    tool_restriction: "rejected_tool_restriction",
    deny_rule_unclosed: "deny_rule_unclosed",
    sdk_mcp: "rejected_argv",
    unsupported: "rejected_unsupported",
  },
  FMs = {
    kind: "lost",
    name: "--max-turns",
    why: "the service did not confirm the turn limit, so assume none is enforced",
  };
//@ chunk-3wek6r2k.js:31880-32097 placement
function cloudLaunchOptionsFrom(e, o) {
  return {
    mcpConfigFlagServers: e.mcpConfigFlagServers,
    flagSettings: o,
    systemPrompt: e.systemPromptCli,
    appendSystemPrompt: e.appendSystemPromptCli,
    selectedAgentDefinition: e.mainThreadAgentDefinition ?? null,
  };
}
//@ chunk-3wek6r2k.js:32097-32145 placement
function withMaxTurns(e, o) {
  return { ...e, maxTurns: o, ...!1 };
}
//@ chunk-3wek6r2k.js:32145-32221 placement
var FLAG_TREAT_CLIENT = { treat: "client" },
  ge = { treat: "create" },
  Se = { treat: "ignore", kind: "lost" };
//@ chunk-3wek6r2k.js:32221-32277 placement
function lostFlag(e) {
  return { treat: "ignore", kind: "lost", why: e };
}
//@ chunk-3wek6r2k.js:32277-32368 placement
var FLAG_TREAT_PREFERENCE = { treat: "ignore", kind: "preference" },
  Fc = { treat: "ignore", kind: "kept" },
  G = { treat: "moot" };
//@ chunk-3wek6r2k.js:32368-32425 placement
function refusedFlag(e, o) {
  return { treat: "refuse", group: e, naming: o };
}

export {
  sanitizeCloudText,
  refusedFlag,
  FLAG_TREAT_CLIENT,
  G,
  lostFlag,
  ge,
  Se,
  FLAG_TREAT_PREFERENCE,
  Fc,
  clipCloudText,
  lPr,
  cloudInformationalMessage,
  clipCloudLine,
  dPr,
  cloudDisconnectReason,
  cloudDisconnectMessage,
  logCloudWorkerInit,
  FMs,
  withMaxTurns,
  cloudLaunchOptionsFrom,
  CLOUD_REFUSAL_SUBTYPES,
};
